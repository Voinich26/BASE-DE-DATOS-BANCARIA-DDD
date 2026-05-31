# Triggers  Sistema de Gestión Bancaria
## FASE 2: Especificación Completa

**Principio:** Los triggers son la primera línea de defensa de las invariantes.
Se ejecutan automáticamente en la BD, sin intervención de la aplicación.
**Fecha:** 2026-05-03

---

## TRG-01: trg_before_insert_usuario

| Atributo | Valor |
|---|---|
| Tabla | usuario |
| Evento | BEFORE INSERT |
| Invariantes | INV-02, INV-03 |

**Pseudocódigo:**
```
BEFORE INSERT ON usuario
  -- Validar formato de correo (INV-02)
  IF NEW.correo_electronico NOT LIKE '%@%.%' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Correo electronico invalido';
  END IF;
  -- Validar longitud de teléfono (INV-03)
  IF CHAR_LENGTH(NEW.telefono) < 7 OR CHAR_LENGTH(NEW.telefono) > 15 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Telefono debe tener entre 7 y 15 digitos';
  END IF;
```

---

## TRG-02: trg_before_insert_cliente_pn

| Atributo | Valor |
|---|---|
| Tabla | cliente_persona_natural |
| Evento | BEFORE INSERT |
| Invariantes | INV-06 |

**Pseudocódigo:**
```
BEFORE INSERT ON cliente_persona_natural
  -- Validar mayoría de edad (INV-06)
  IF TIMESTAMPDIFF(YEAR, NEW.fecha_nacimiento, CURDATE()) < 18 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El cliente debe ser mayor de edad';
  END IF;
```

---

## TRG-03: trg_before_insert_cuenta

| Atributo | Valor |
|---|---|
| Tabla | cuenta_bancaria |
| Evento | BEFORE INSERT |
| Invariantes | INV-11 |

**Pseudocódigo:**
```
BEFORE INSERT ON cuenta_bancaria
  -- Validar que el usuario titular esté activo (INV-11)
  SELECT id_estado_usuario INTO v_estado
    FROM usuario WHERE id_usuario = NEW.id_usuario_apertura;
  IF v_estado != 'Activo' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No se puede abrir cuenta para usuario inactivo';
  END IF;
```

---

## TRG-04: trg_before_update_cuenta

| Atributo | Valor |
|---|---|
| Tabla | cuenta_bancaria |
| Evento | BEFORE UPDATE |
| Invariantes | INV-09, INV-13 |

**Pseudocódigo:**
```
BEFORE UPDATE ON cuenta_bancaria
  -- Rechazar cambio de moneda (INV-13)
  IF NEW.id_moneda != OLD.id_moneda THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La moneda de una cuenta es inmutable';
  END IF;
  -- Rechazar saldo negativo (INV-09)
  IF NEW.saldo_actual < 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El saldo no puede ser negativo';
  END IF;
```

---

## TRG-05: trg_after_update_cuenta_saldo

| Atributo | Valor |
|---|---|
| Tabla | cuenta_bancaria |
| Evento | AFTER UPDATE |
| Invariantes | INV-28, EVT-07 |

**Pseudocódigo:**
```
AFTER UPDATE ON cuenta_bancaria
  -- Solo si cambió el saldo o el estado
  IF NEW.saldo_actual != OLD.saldo_actual OR NEW.id_estado_cuenta != OLD.id_estado_cuenta THEN
    SET v_json = JSON_OBJECT(
      'numero_cuenta', OLD.numero_cuenta,
      'saldo_antes',   OLD.saldo_actual,
      'saldo_despues', NEW.saldo_actual,
      'estado_antes',  OLD.id_estado_cuenta,
      'estado_despues',NEW.id_estado_cuenta
    );
    CALL sp_registrar_bitacora('CUENTA', @id_usuario_sesion, @rol_sesion,
      OLD.numero_cuenta, 'CUENTA', v_json);
  END IF;
```

---

## TRG-06: trg_before_insert_prestamo

| Atributo | Valor |
|---|---|
| Tabla | prestamo |
| Evento | BEFORE INSERT |
| Invariantes | INV-19, RP-01 |

**Pseudocódigo:**
```
BEFORE INSERT ON prestamo
  -- Validar cliente activo (INV-19)
  SELECT id_estado_usuario INTO v_estado
    FROM usuario WHERE id_usuario = NEW.id_usuario_solicitante;
  IF v_estado != 'Activo' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cliente inactivo no puede solicitar prestamos';
  END IF;
  -- Forzar estado inicial = En Estudio (RP-01)
  SET NEW.id_estado_prestamo = (SELECT id_estado_prestamo FROM cat_estado_prestamo WHERE nombre_estado = 'En Estudio');
  SET NEW.fecha_solicitud = NOW();
```

---

## TRG-07: trg_before_update_prestamo

| Atributo | Valor |
|---|---|
| Tabla | prestamo |
| Evento | BEFORE UPDATE |
| Invariantes | INV-14, INV-15, INV-16 |

**Pseudocódigo:**
```
BEFORE UPDATE ON prestamo
  -- Solo si cambia el estado
  IF NEW.id_estado_prestamo != OLD.id_estado_prestamo THEN
    -- Validar que la transición existe en la tabla de transiciones (INV-15)
    SELECT COUNT(*) INTO v_count FROM prestamo_transicion_estado
      WHERE id_estado_origen  = OLD.id_estado_prestamo
        AND id_estado_destino = NEW.id_estado_prestamo;
    IF v_count = 0 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Transicion de estado de prestamo no permitida';
    END IF;
    -- Validar rol del usuario que ejecuta el cambio (INV-14)
    SELECT id_rol_requerido INTO v_rol_req FROM prestamo_transicion_estado
      WHERE id_estado_origen  = OLD.id_estado_prestamo
        AND id_estado_destino = NEW.id_estado_prestamo;
    SELECT id_rol INTO v_rol_actual FROM usuario WHERE id_usuario = @id_usuario_sesion;
    IF v_rol_actual != v_rol_req THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Rol no autorizado para esta transicion';
    END IF;
  END IF;
```

---

## TRG-08: trg_after_update_prestamo

| Atributo | Valor |
|---|---|
| Tabla | prestamo |
| Evento | AFTER UPDATE |
| Invariantes | INV-28, RP-06, EVT-08 al EVT-11 |

**Pseudocódigo:**
```
AFTER UPDATE ON prestamo
  IF NEW.id_estado_prestamo != OLD.id_estado_prestamo THEN
    SET v_json = JSON_OBJECT(
      'id_prestamo',     OLD.id_prestamo,
      'estado_anterior', OLD.id_estado_prestamo,
      'estado_nuevo',    NEW.id_estado_prestamo,
      'monto_aprobado',  NEW.monto_aprobado,
      'tasa_interes',    NEW.tasa_interes,
      'plazo_meses',     NEW.plazo_meses
    );
    CALL sp_registrar_bitacora('PRESTAMO', @id_usuario_sesion, @rol_sesion,
      OLD.id_prestamo, 'PRESTAMO', v_json);
    -- Si el nuevo estado es Desembolsado, llamar al SP de desembolso
    IF NEW.id_estado_prestamo = 'Desembolsado' THEN
      CALL sp_desembolsar_prestamo(OLD.id_prestamo, @id_usuario_sesion);
    END IF;
  END IF;
```

---

## TRG-09: trg_before_insert_transferencia

| Atributo | Valor |
|---|---|
| Tabla | transferencia |
| Evento | BEFORE INSERT |
| Invariantes | INV-20, INV-22, RP-07, RP-08 |

**Pseudocódigo:**
```
BEFORE INSERT ON transferencia
  -- Validar monto > 0 (INV-20)
  IF NEW.monto <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El monto debe ser mayor a cero';
  END IF;
  -- Validar cuentas no bloqueadas (INV-22)
  SELECT id_estado_cuenta INTO v_est_origen  FROM cuenta_bancaria WHERE numero_cuenta = NEW.cuenta_origen;
  SELECT id_estado_cuenta INTO v_est_destino FROM cuenta_bancaria WHERE numero_cuenta = NEW.cuenta_destino;
  IF v_est_origen  != 'Activa' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cuenta origen bloqueada'; END IF;
  IF v_est_destino != 'Activa' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cuenta destino bloqueada'; END IF;
  -- Validar usuario creador activo (INV-04)
  SELECT id_estado_usuario INTO v_est_usr FROM usuario WHERE id_usuario = NEW.id_usuario_creador;
  IF v_est_usr != 'Activo' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Usuario inactivo'; END IF;
  -- Determinar si requiere aprobación (RP-07, RP-08)
  SELECT monto_umbral INTO v_umbral FROM config_umbral_transferencia WHERE vigente = TRUE LIMIT 1;
  IF NEW.monto > v_umbral THEN
    SET NEW.requiere_aprobacion = TRUE;
    SET NEW.id_estado_transferencia = (SELECT id FROM cat_estado_transferencia WHERE nombre_estado = 'En Espera de Aprobacion');
  ELSE
    SET NEW.requiere_aprobacion = FALSE;
    SET NEW.id_estado_transferencia = (SELECT id FROM cat_estado_transferencia WHERE nombre_estado = 'Pendiente');
  END IF;
  -- Calcular fecha de vencimiento (RP-12)
  SET NEW.fecha_creacion   = NOW();
  SET NEW.fecha_vencimiento = DATE_ADD(NOW(), INTERVAL 60 MINUTE);
```

---

## TRG-10: trg_after_insert_transferencia

| Atributo | Valor |
|---|---|
| Tabla | transferencia |
| Evento | AFTER INSERT |
| Invariantes | RP-07, EVT-12 |

**Pseudocódigo:**
```
AFTER INSERT ON transferencia
  -- Registrar creación en bitácora (EVT-12)
  CALL sp_registrar_bitacora('TRANSFERENCIA_CREADA', @id_usuario_sesion, @rol_sesion,
    NEW.id_transferencia, 'TRANSFERENCIA',
    JSON_OBJECT('monto', NEW.monto, 'origen', NEW.cuenta_origen, 'destino', NEW.cuenta_destino));
  -- Si no requiere aprobación, ejecutar directamente (RP-07)
  IF NEW.requiere_aprobacion = FALSE THEN
    CALL sp_ejecutar_transferencia(NEW.id_transferencia);
  END IF;
```

---

## TRG-11: trg_before_update_transferencia

| Atributo | Valor |
|---|---|
| Tabla | transferencia |
| Evento | BEFORE UPDATE |
| Invariantes | INV-23, INV-25 |

**Pseudocódigo:**
```
BEFORE UPDATE ON transferencia
  IF NEW.id_estado_transferencia != OLD.id_estado_transferencia THEN
    -- Rechazar si está vencida (INV-23)
    IF OLD.id_estado_transferencia = 'Vencida' THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Transferencia vencida no puede modificarse';
    END IF;
    -- Validar transición en tabla de transiciones
    SELECT COUNT(*) INTO v_count FROM transferencia_transicion_estado
      WHERE id_estado_origen  = OLD.id_estado_transferencia
        AND id_estado_destino = NEW.id_estado_transferencia;
    IF v_count = 0 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Transicion de estado no permitida';
    END IF;
    -- Validar rol del usuario (INV-25)
    SELECT id_rol_requerido INTO v_rol_req FROM transferencia_transicion_estado
      WHERE id_estado_origen  = OLD.id_estado_transferencia
        AND id_estado_destino = NEW.id_estado_transferencia;
    SELECT id_rol INTO v_rol_actual FROM usuario WHERE id_usuario = @id_usuario_sesion;
    IF v_rol_actual != v_rol_req THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Rol no autorizado para esta transicion';
    END IF;
  END IF;
```

---

## TRG-12: trg_after_update_transferencia

| Atributo | Valor |
|---|---|
| Tabla | transferencia |
| Evento | AFTER UPDATE |
| Invariantes | INV-28, RP-13, EVT-14 al EVT-17 |

**Pseudocódigo:**
```
AFTER UPDATE ON transferencia
  IF NEW.id_estado_transferencia != OLD.id_estado_transferencia THEN
    -- Construir JSON de detalle según el nuevo estado
    IF NEW.id_estado_transferencia = 'Ejecutada' THEN
      SET v_json = JSON_OBJECT(
        'cuenta_origen',        NEW.cuenta_origen,
        'cuenta_destino',       NEW.cuenta_destino,
        'monto',                NEW.monto,
        'saldo_origen_antes',   NEW.saldo_origen_antes,
        'saldo_origen_despues', NEW.saldo_origen_despues,
        'saldo_destino_antes',  NEW.saldo_destino_antes,
        'saldo_destino_despues',NEW.saldo_destino_despues
      );
    ELSEIF NEW.id_estado_transferencia = 'Vencida' THEN
      SET v_json = JSON_OBJECT(
        'id_transferencia',  OLD.id_transferencia,
        'estado_anterior',   OLD.id_estado_transferencia,
        'estado_nuevo',      'Vencida',
        'motivo',            'Tiempo de aprobacion expirado',
        'fecha_creacion',    OLD.fecha_creacion,
        'fecha_vencimiento', OLD.fecha_vencimiento
      );
    ELSE
      SET v_json = JSON_OBJECT(
        'id_transferencia', OLD.id_transferencia,
        'estado_anterior',  OLD.id_estado_transferencia,
        'estado_nuevo',     NEW.id_estado_transferencia
      );
    END IF;
    CALL sp_registrar_bitacora('TRANSFERENCIA', @id_usuario_sesion, @rol_sesion,
      OLD.id_transferencia, 'TRANSFERENCIA', v_json);
    -- Si fue aprobada, ejecutar el movimiento
    IF NEW.id_estado_transferencia = 'Aprobada' THEN
      CALL sp_ejecutar_transferencia(OLD.id_transferencia);
    END IF;
  END IF;
```

---

## TRG-13: evt_vencimiento_transferencias (MySQL Event)

| Atributo | Valor |
|---|---|
| Tipo | MySQL Event Scheduler |
| Frecuencia | Cada 1 minuto |
| Invariantes | RP-12, RP-13, EVT-17 |

**Pseudocódigo:**
```
EVENT evt_vencimiento_transferencias
  ON SCHEDULE EVERY 1 MINUTE
  DO
    -- Marcar como Vencidas todas las transferencias expiradas (RP-12)
    UPDATE transferencia
    SET id_estado_transferencia = (SELECT id FROM cat_estado_transferencia WHERE nombre_estado = 'Vencida')
    WHERE id_estado_transferencia = (SELECT id FROM cat_estado_transferencia WHERE nombre_estado = 'En Espera de Aprobacion')
      AND NOW() > fecha_vencimiento;
    -- TRG-12 se dispara automáticamente por cada fila actualizada
    -- y registra EVT-17 en bitácora con motivo 'Tiempo de aprobacion expirado'
```

---

## TRG-01b: trg_before_update_usuario

> **NOTA:** Este trigger fue agregado en la implementacion final (Banco_Based/05_triggers.sql) como complemento a TRG-01. No estaba en la especificacion inicial pero es necesario para garantizar INV-02 e INV-03 tambien en operaciones UPDATE.

| Atributo | Valor |
|---|---|
| Tabla | usuario |
| Evento | BEFORE UPDATE |
| Invariantes | INV-02, INV-03 |

**Proposito:** Garantizar que las actualizaciones de correo y telefono en la tabla usuario tambien cumplan las invariantes de formato, no solo los INSERT.

**Pseudocodigo:**
```
BEFORE UPDATE ON usuario
  IF NEW.correo_electronico NOT LIKE '%@%.%' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INV-02: Correo electronico invalido';
  END IF;
  IF CHAR_LENGTH(NEW.telefono) < 7 OR CHAR_LENGTH(NEW.telefono) > 15 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INV-03: Telefono debe tener entre 7 y 15 digitos';
  END IF;
```

---

## TRG-14: trg_before_insert_umbral

> **NOTA:** Este trigger fue agregado en la implementacion final como mejora de seguridad. Garantiza que solo exista un umbral de transferencia vigente en cualquier momento.

| Atributo | Valor |
|---|---|
| Tabla | config_umbral_transferencia |
| Evento | BEFORE INSERT |
| Invariantes | Integridad de configuracion de umbral |

**Proposito:** Evitar que existan dos registros con `vigente = TRUE` simultaneamente en `config_umbral_transferencia`, lo que causaria comportamiento indeterminado en TRG-09 al seleccionar el umbral activo.

**Pseudocodigo:**
```
BEFORE INSERT ON config_umbral_transferencia
  IF NEW.vigente = TRUE THEN
    SELECT COUNT(*) INTO v_count FROM config_umbral_transferencia WHERE vigente = TRUE;
    IF v_count > 0 THEN
      SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Ya existe un umbral vigente. Desactive el actual antes de crear uno nuevo.';
    END IF;
  END IF;
```

---

## NOTA SOBRE TRG-13 (evt_vencimiento_transferencias)

En la implementacion final, TRG-13 es tecnicamente un **MySQL Event Scheduler** (no un trigger en sentido estricto). Se mantiene la numeracion TRG-13 por consistencia con el resto del documento, pero en MySQL se crea con `CREATE EVENT`, no con `CREATE TRIGGER`. El Event Scheduler debe estar habilitado con `SET GLOBAL event_scheduler = ON` (ver 01_schema.sql).

---

## NOTA SOBRE RESTRICCION DE MAYORIA DE EDAD (INV-06)

La documentacion original en SDD/03_Data_Model/data_model.md especifica:
```
CHECK (TIMESTAMPDIFF(YEAR, fecha_nacimiento, CURDATE()) >= 18)
```

Sin embargo, **MySQL 8 no permite funciones no deterministas como CURDATE() en CHECK constraints** (ERROR 3814). Por esta razon, la validacion se implementa en **TRG-02** (trg_before_insert_cliente_pn) en lugar de un CHECK constraint. El comportamiento es identico: ningun cliente menor de edad puede ser registrado.
