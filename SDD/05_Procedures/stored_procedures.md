# Stored Procedures  Sistema de Gestión Bancaria
## FASE 2: Especificación Completa

**Principio:** Toda operación transaccional se ejecuta a través de Stored Procedures.
La aplicación nunca ejecuta INSERT/UPDATE/DELETE directamente sobre tablas críticas.
**Fecha:** 2026-05-03

---

## SP-01: sp_ejecutar_transferencia

**Bounded Context:** BC-05 Transferencias
**Propósito:** Ejecutar el movimiento de fondos entre dos cuentas de forma atómica.

**Parámetros de entrada:**

| Parámetro | Tipo | Descripción |
|---|---|---|
| p_id_transferencia | INT UNSIGNED | ID de la transferencia a ejecutar |

**Lógica (pseudocódigo):**
```
PROCEDURE sp_ejecutar_transferencia(p_id_transferencia)
  START TRANSACTION;
  -- 1. Obtener datos de la transferencia con bloqueo
  SELECT cuenta_origen, cuenta_destino, monto, id_estado
    INTO v_origen, v_destino, v_monto, v_estado
    FROM transferencia WHERE id_transferencia = p_id_transferencia FOR UPDATE;

  -- 2. Validar que no esté vencida ni ejecutada (INV-23)
  IF v_estado IN ('Vencida','Ejecutada','Rechazada') THEN
    ROLLBACK; SIGNAL estado_invalido;
  END IF;

  -- 3. Obtener saldos actuales con bloqueo (INV-21)
  SELECT saldo_actual INTO v_saldo_origen
    FROM cuenta_bancaria WHERE numero_cuenta = v_origen FOR UPDATE;
  SELECT saldo_actual INTO v_saldo_destino
    FROM cuenta_bancaria WHERE numero_cuenta = v_destino FOR UPDATE;

  -- 4. Validar saldo suficiente (INV-21)
  IF v_saldo_origen < v_monto THEN
    ROLLBACK; SIGNAL saldo_insuficiente;
  END IF;

  -- 5. Validar cuentas activas (INV-22)
  IF estado_cuenta_origen != 'Activa' OR estado_cuenta_destino != 'Activa' THEN
    ROLLBACK; SIGNAL cuenta_bloqueada;
  END IF;

  -- 6. Guardar snapshots para bitácora (RP-23)
  UPDATE transferencia SET
    saldo_origen_antes  = v_saldo_origen,
    saldo_destino_antes = v_saldo_destino
  WHERE id_transferencia = p_id_transferencia;

  -- 7. Ejecutar movimiento atómico (INV-26)
  UPDATE cuenta_bancaria SET saldo_actual = saldo_actual - v_monto
    WHERE numero_cuenta = v_origen;
  UPDATE cuenta_bancaria SET saldo_actual = saldo_actual + v_monto
    WHERE numero_cuenta = v_destino;

  -- 8. Actualizar snapshots post-ejecución
  UPDATE transferencia SET
    saldo_origen_despues  = v_saldo_origen  - v_monto,
    saldo_destino_despues = v_saldo_destino + v_monto,
    id_estado_transferencia = 'Ejecutada'
  WHERE id_transferencia = p_id_transferencia;

  COMMIT;
  -- TRG-12 se dispara automáticamente y registra en bitácora
END
```

**Invariantes cubiertas:** INV-21, INV-22, INV-23, INV-26, RP-14, RP-23
**Errores posibles:** estado_invalido, saldo_insuficiente, cuenta_bloqueada

---

## SP-02: sp_desembolsar_prestamo

**Bounded Context:** BC-04 Préstamos
**Propósito:** Acreditar el monto aprobado de un préstamo a la cuenta destino y cerrar el ciclo de desembolso.

**Parámetros de entrada:**

| Parámetro | Tipo | Descripción |
|---|---|---|
| p_id_prestamo | INT UNSIGNED | ID del préstamo a desembolsar |
| p_id_analista | INT UNSIGNED | ID del analista que ejecuta el desembolso |

**Lógica (pseudocódigo):**
```
PROCEDURE sp_desembolsar_prestamo(p_id_prestamo, p_id_analista)
  START TRANSACTION;
  -- 1. Obtener datos del préstamo
  SELECT monto_aprobado, cuenta_destino_desembolso, id_estado, id_cliente_solicitante, tipo_cliente
    INTO v_monto, v_cuenta, v_estado, v_cliente, v_tipo
    FROM prestamo WHERE id_prestamo = p_id_prestamo FOR UPDATE;

  -- 2. Validar estado = Aprobado (INV-15)
  IF v_estado != 'Aprobado' THEN
    ROLLBACK; SIGNAL estado_invalido;
  END IF;

  -- 3. Validar monto aprobado > 0 (INV-17)
  IF v_monto IS NULL OR v_monto <= 0 THEN
    ROLLBACK; SIGNAL monto_invalido;
  END IF;

  -- 4. Validar cuenta destino activa y del cliente (INV-18)
  SELECT id_titular, tipo_titular, id_estado_cuenta INTO v_titular, v_tipo_tit, v_est_cuenta
    FROM cuenta_bancaria WHERE numero_cuenta = v_cuenta FOR UPDATE;
  IF v_est_cuenta != 'Activa' THEN
    ROLLBACK; SIGNAL cuenta_bloqueada;
  END IF;
  IF v_titular != v_cliente OR v_tipo_tit != v_tipo THEN
    ROLLBACK; SIGNAL cuenta_no_pertenece_cliente;
  END IF;

  -- 5. Validar rol del analista (INV-14)
  SELECT id_rol INTO v_rol FROM usuario WHERE id_usuario = p_id_analista;
  IF v_rol != ROL_ANALISTA_INTERNO THEN
    ROLLBACK; SIGNAL rol_no_autorizado;
  END IF;

  -- 6. Acreditar saldo (RP-04)
  UPDATE cuenta_bancaria SET saldo_actual = saldo_actual + v_monto
    WHERE numero_cuenta = v_cuenta;

  -- 7. Actualizar estado del préstamo (RP-05)
  UPDATE prestamo SET
    id_estado_prestamo = 'Desembolsado',
    fecha_desembolso   = NOW()
  WHERE id_prestamo = p_id_prestamo;

  COMMIT;
  -- TRG-08 registra EVT-11 en bitácora automáticamente
END
```

**Invariantes cubiertas:** INV-14, INV-15, INV-17, INV-18, RP-04, RP-05

---

## SP-03: sp_registrar_bitacora

**Bounded Context:** BC-06 Auditoría
**Propósito:** Insertar un registro inmutable en la colección NoSQL bitacora_operaciones.

**Parámetros de entrada:**

| Parámetro | Tipo | Descripción |
|---|---|---|
| p_tipo_operacion | VARCHAR(50) | Tipo: TRANSFERENCIA, PRESTAMO, CUENTA, VENCIMIENTO |
| p_id_usuario | INT UNSIGNED | ID del usuario que ejecutó la operación |
| p_rol_usuario | VARCHAR(60) | Nombre del rol del usuario |
| p_id_producto | VARCHAR(30) | ID del recurso afectado |
| p_tipo_producto | VARCHAR(20) | CUENTA / PRESTAMO / TRANSFERENCIA |
| p_detalle_json | JSON | Snapshot con datos antes/después |

**Lógica (pseudocódigo):**
```
PROCEDURE sp_registrar_bitacora(p_tipo, p_id_usuario, p_rol, p_id_producto, p_tipo_prod, p_json)
  -- Genera UUID para el registro
  SET v_id = UUID();

  -- Inserta en MongoDB vía conector o tabla de cola de eventos
  INSERT INTO bitacora_cola (id_bitacora, tipo_operacion, fecha_hora_operacion,
    id_usuario, rol_usuario, id_producto_afectado, tipo_producto, datos_detalle)
  VALUES (v_id, p_tipo, NOW(), p_id_usuario, p_rol, p_id_producto, p_tipo_prod, p_json);
  -- El proceso de sincronización transfiere bitacora_cola → MongoDB
END
```

**Nota:** En implementaciones donde MySQL tiene acceso directo a MongoDB (vía UDF o conector), la inserción es directa. En otros casos se usa una tabla de cola relacional que un proceso externo sincroniza.

**Invariantes cubiertas:** INV-27, INV-28, INV-29, RP-22

---

## SP-04: sp_bloquear_cuenta

**Bounded Context:** BC-03 Cuentas Bancarias
**Propósito:** Cambiar el estado de una cuenta a Bloqueada y registrar el evento en bitácora.

**Parámetros:**

| Parámetro | Tipo | Descripción |
|---|---|---|
| p_numero_cuenta | VARCHAR(30) | Cuenta a bloquear |
| p_id_usuario_ejecutor | INT UNSIGNED | Usuario que ejecuta el bloqueo |
| p_motivo | VARCHAR(200) | Motivo del bloqueo |

**Lógica (pseudocódigo):**
```
PROCEDURE sp_bloquear_cuenta(p_numero_cuenta, p_id_usuario, p_motivo)
  START TRANSACTION;
  SELECT id_estado_cuenta INTO v_estado FROM cuenta_bancaria
    WHERE numero_cuenta = p_numero_cuenta FOR UPDATE;
  IF v_estado = 'Cerrada' THEN
    ROLLBACK; SIGNAL cuenta_cerrada_no_bloqueable;
  END IF;
  UPDATE cuenta_bancaria SET id_estado_cuenta = 'Bloqueada'
    WHERE numero_cuenta = p_numero_cuenta;
  COMMIT;
  -- TRG-05 registra EVT-06 en bitácora automáticamente
END
```

**Invariantes cubiertas:** INV-10, EVT-06

---

## SP-05: sp_aprobar_prestamo

**Bounded Context:** BC-04 Préstamos
**Propósito:** Cambiar el estado del préstamo a Aprobado, registrar datos del crédito y fecha de aprobación.

**Parámetros:**

| Parámetro | Tipo | Descripción |
|---|---|---|
| p_id_prestamo | INT UNSIGNED | Préstamo a aprobar |
| p_id_analista | INT UNSIGNED | Analista que aprueba |
| p_monto_aprobado | DECIMAL(18,2) | Monto aprobado (puede diferir del solicitado) |
| p_tasa_interes | DECIMAL(6,4) | Tasa de interés anual |
| p_plazo_meses | SMALLINT | Plazo en meses |
| p_cuenta_destino | VARCHAR(30) | Cuenta donde se desembolsará |

**Lógica (pseudocódigo):**
```
PROCEDURE sp_aprobar_prestamo(p_id_prestamo, p_id_analista, p_monto, p_tasa, p_plazo, p_cuenta)
  -- Validar rol analista (INV-14)
  IF rol(p_id_analista) != ANALISTA_INTERNO THEN SIGNAL rol_no_autorizado; END IF;
  -- Validar estado actual = En Estudio (INV-15)
  IF estado(p_id_prestamo) != 'En Estudio' THEN SIGNAL transicion_invalida; END IF;
  -- Validar monto > 0 (INV-17)
  IF p_monto <= 0 THEN SIGNAL monto_invalido; END IF;
  -- Actualizar préstamo (RP-03)
  UPDATE prestamo SET
    id_estado_prestamo       = 'Aprobado',
    monto_aprobado           = p_monto,
    tasa_interes             = p_tasa,
    plazo_meses              = p_plazo,
    cuenta_destino_desembolso = p_cuenta,
    id_analista_aprobador    = p_id_analista,
    fecha_aprobacion         = NOW()
  WHERE id_prestamo = p_id_prestamo;
  -- TRG-08 registra EVT-09 en bitácora
END
```

**Invariantes cubiertas:** INV-14, INV-15, INV-17, RP-02, RP-03

---

## SP-06: sp_rechazar_prestamo

**Bounded Context:** BC-04 Préstamos
**Propósito:** Cambiar el estado del préstamo a Rechazado.

**Parámetros:**

| Parámetro | Tipo | Descripción |
|---|---|---|
| p_id_prestamo | INT UNSIGNED | Préstamo a rechazar |
| p_id_analista | INT UNSIGNED | Analista que rechaza |
| p_motivo | VARCHAR(300) | Motivo del rechazo |

**Lógica (pseudocódigo):**
```
PROCEDURE sp_rechazar_prestamo(p_id_prestamo, p_id_analista, p_motivo)
  IF rol(p_id_analista) != ANALISTA_INTERNO THEN SIGNAL rol_no_autorizado; END IF;
  IF estado(p_id_prestamo) != 'En Estudio' THEN SIGNAL transicion_invalida; END IF;
  UPDATE prestamo SET
    id_estado_prestamo    = 'Rechazado',
    id_analista_aprobador = p_id_analista,
    fecha_aprobacion      = NOW()
  WHERE id_prestamo = p_id_prestamo;
  -- TRG-08 registra EVT-10 en bitácora con p_motivo en datos_detalle
END
```

**Invariantes cubiertas:** INV-14, INV-15, RP-02

---

## SP-07: sp_aprobar_transferencia

**Bounded Context:** BC-05 Transferencias
**Propósito:** Aprobar una transferencia en espera y disparar su ejecución.

**Parámetros:**

| Parámetro | Tipo | Descripción |
|---|---|---|
| p_id_transferencia | INT UNSIGNED | Transferencia a aprobar |
| p_id_supervisor | INT UNSIGNED | Supervisor que aprueba |

**Lógica (pseudocódigo):**
```
PROCEDURE sp_aprobar_transferencia(p_id_transferencia, p_id_supervisor)
  -- Validar rol supervisor (INV-25)
  IF rol(p_id_supervisor) != SUPERVISOR_EMPRESA THEN SIGNAL rol_no_autorizado; END IF;
  -- Validar estado = En Espera de Aprobacion
  IF estado(p_id_transferencia) != 'En Espera de Aprobacion' THEN SIGNAL transicion_invalida; END IF;
  -- Validar no vencida (INV-23)
  IF NOW() > fecha_vencimiento(p_id_transferencia) THEN SIGNAL transferencia_vencida; END IF;
  -- Cambiar estado a Aprobada (RP-09)
  UPDATE transferencia SET
    id_estado_transferencia = 'Aprobada',
    id_usuario_aprobador    = p_id_supervisor,
    fecha_aprobacion        = NOW()
  WHERE id_transferencia = p_id_transferencia;
  -- TRG-12 detecta estado=Aprobada y llama sp_ejecutar_transferencia
END
```

**Invariantes cubiertas:** INV-23, INV-25, RP-09, RP-10

---

## SP-08: sp_rechazar_transferencia

**Bounded Context:** BC-05 Transferencias
**Propósito:** Rechazar una transferencia en espera de aprobación.

**Parámetros:**

| Parámetro | Tipo | Descripción |
|---|---|---|
| p_id_transferencia | INT UNSIGNED | Transferencia a rechazar |
| p_id_supervisor | INT UNSIGNED | Supervisor que rechaza |
| p_motivo | VARCHAR(300) | Motivo del rechazo |

**Lógica (pseudocódigo):**
```
PROCEDURE sp_rechazar_transferencia(p_id_transferencia, p_id_supervisor, p_motivo)
  IF rol(p_id_supervisor) != SUPERVISOR_EMPRESA THEN SIGNAL rol_no_autorizado; END IF;
  IF estado(p_id_transferencia) != 'En Espera de Aprobacion' THEN SIGNAL transicion_invalida; END IF;
  UPDATE transferencia SET
    id_estado_transferencia = 'Rechazada',
    id_usuario_aprobador    = p_id_supervisor,
    fecha_aprobacion        = NOW()
  WHERE id_transferencia = p_id_transferencia;
  -- TRG-12 registra EVT-15 en bitácora con p_motivo
END
```

**Invariantes cubiertas:** INV-25, RP-11

---

## SP-01b: sp_ejecutar_transferencia_interna

> **NOTA:** Este SP fue agregado en la implementacion final (Banco_Based/06_procedures.sql) como solucion tecnica a una limitacion de MySQL: los triggers no pueden llamar SPs que contengan START TRANSACTION porque eso causa un COMMIT implicito que rompe la atomicidad del trigger. Este SP es identico a SP-01 pero SIN gestion de transaccion propia.

**Bounded Context:** BC-05 Transferencias
**Proposito:** Ejecutar el movimiento de fondos desde dentro de un trigger (TRG-10 o TRG-12), reutilizando la transaccion implicita del trigger.

**Diferencias con SP-01:**
- NO tiene START TRANSACTION / COMMIT / ROLLBACK
- Usa LOCK IN SHARE MODE en lugar de FOR UPDATE para la fila de transferencia (evita deadlock con el lock del trigger)
- NO gestiona la variable de guardia @trg_transf_ejecutando (eso lo hace TRG-12)

**Parámetros:**

| Parámetro | Tipo | Descripción |
|---|---|---|
| p_id_transferencia | INT UNSIGNED | ID de la transferencia a ejecutar |

**Invariantes cubiertas:** INV-21, INV-22, INV-23, INV-26, RP-14, RP-23

---

## NOTAS DE IMPLEMENTACION FINAL

### Contexto de sesion antes de transacciones

En la implementacion final, todos los SPs que modifican estado y disparan triggers que leen `@id_usuario_sesion` establecen esa variable **ANTES** del `START TRANSACTION`. Esto es necesario porque las variables de sesion de MySQL no participan en el mecanismo de ROLLBACK  si se setean dentro de la transaccion y ocurre un ROLLBACK, la variable ya fue modificada y no se revierte.

### Motivo de rechazo en bitacora

`sp_rechazar_prestamo` recibe el parametro `p_motivo` y lo almacena en `@motivo_rechazo_prestamo` antes de la transaccion. TRG-08 (AFTER UPDATE prestamo) lee esta variable y la incluye en el JSON de la bitacora bajo la clave `motivo_rechazo`.
