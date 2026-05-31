# Seguridad y Control de Acceso  Sistema de Gestión Bancaria
## FASE 2: Diseño de Seguridad en Base de Datos

**Principio:** La seguridad de acceso a datos se implementa en la BD mediante roles de MySQL,
vistas filtradas por rol y permisos granulares sobre tablas y procedimientos.
**Fecha:** 2026-05-03

---

## 1. ROLES DEL SISTEMA Y SUS CAPACIDADES

| Rol | Puede VER | Puede CREAR | Puede APROBAR | Puede MODIFICAR SALDOS |
|---|---|---|---|---|
| Cliente Persona Natural | Sus cuentas, préstamos, transferencias | Solicitar préstamos, crear transferencias | No | No directamente |
| Cliente Empresa | Cuentas y préstamos de su empresa | Delegar permisos | Transferencias de alto valor | No directamente |
| Empleado Ventanilla | Saldos y estado de cuentas | Abrir cuentas | No | No |
| Empleado Comercial | Clientes y productos | Solicitudes de productos | No | No |
| Empleado Empresa | Solo su empresa | Transferencias y pagos masivos | No (si supera umbral) | No directamente |
| Supervisor Empresa | Transferencias de su empresa | No | Transferencias de alto valor | No |
| Analista Interno | Todo (préstamos + bitácora) | No | Préstamos | No arbitrariamente |

---

## 2. USUARIOS DE BASE DE DATOS POR ROL

Cada rol del sistema se mapea a un usuario de MySQL con permisos específicos.

| Usuario MySQL | Rol del sistema | Permisos base |
|---|---|---|
| db_cliente_pn | Cliente Persona Natural | EXECUTE en SPs propios; SELECT en vistas v_*_cliente_pn |
| db_cliente_empresa | Cliente Empresa | EXECUTE en SPs de empresa; SELECT en vistas v_*_empresa |
| db_emp_ventanilla | Empleado Ventanilla | SELECT en v_cuentas_ventanilla; EXECUTE sp_abrir_cuenta |
| db_emp_comercial | Empleado Comercial | SELECT/INSERT en producto_bancario; SELECT en clientes |
| db_emp_empresa | Empleado Empresa | EXECUTE sp_crear_transferencia; SELECT en v_transferencias_empresa_op |
| db_supervisor | Supervisor Empresa | EXECUTE sp_aprobar/rechazar_transferencia; SELECT en v_transferencias_supervisor |
| db_analista | Analista Interno | EXECUTE sp_aprobar/rechazar/desembolsar_prestamo; SELECT en v_prestamos_analista, v_bitacora_analista |
| db_sistema | Sistema (triggers/events) | EXECUTE todos los SPs; INSERT en bitacora_cola |

---

## 3. VISTAS DE SEGURIDAD POR ROL

Cada vista filtra los datos según el contexto del usuario conectado.
La variable de sesión @id_usuario_sesion se establece al inicio de cada conexión.

### Vista: v_cuentas_cliente_pn
**Rol:** Cliente Persona Natural | **Regla:** RP-15
```sql
CREATE VIEW v_cuentas_cliente_pn AS
  SELECT cb.numero_cuenta, cb.tipo_cuenta, cb.saldo_actual, cb.id_moneda,
         cb.id_estado_cuenta, cb.fecha_apertura
  FROM cuenta_bancaria cb
  JOIN cliente_persona_natural cpn ON cb.id_titular = cpn.id_identificacion
    AND cb.tipo_titular = 'PERSONA_NATURAL'
  WHERE cpn.id_usuario = @id_usuario_sesion;
```

### Vista: v_prestamos_cliente_pn
**Rol:** Cliente Persona Natural | **Regla:** RP-15
```sql
CREATE VIEW v_prestamos_cliente_pn AS
  SELECT p.id_prestamo, p.id_tipo_prestamo, p.monto_solicitado, p.monto_aprobado,
         p.tasa_interes, p.plazo_meses, p.id_estado_prestamo,
         p.fecha_solicitud, p.fecha_aprobacion, p.fecha_desembolso
  FROM prestamo p
  JOIN cliente_persona_natural cpn ON p.id_cliente_solicitante = cpn.id_identificacion
    AND p.tipo_cliente = 'PERSONA_NATURAL'
  WHERE cpn.id_usuario = @id_usuario_sesion;
```

### Vista: v_transferencias_cliente_pn
**Rol:** Cliente Persona Natural | **Regla:** RP-15
```sql
CREATE VIEW v_transferencias_cliente_pn AS
  SELECT t.id_transferencia, t.cuenta_origen, t.cuenta_destino, t.monto,
         t.id_estado_transferencia, t.fecha_creacion, t.fecha_aprobacion
  FROM transferencia t
  WHERE t.id_usuario_creador = @id_usuario_sesion;
```

### Vista: v_cuentas_empresa
**Rol:** Cliente Empresa | **Regla:** RP-16
```sql
CREATE VIEW v_cuentas_empresa AS
  SELECT cb.numero_cuenta, cb.tipo_cuenta, cb.saldo_actual,
         cb.id_moneda, cb.id_estado_cuenta, cb.fecha_apertura
  FROM cuenta_bancaria cb
  JOIN cliente_empresa ce ON cb.id_titular = ce.nit
    AND cb.tipo_titular = 'EMPRESA'
  WHERE ce.id_usuario = @id_usuario_sesion;
```

### Vista: v_cuentas_ventanilla
**Rol:** Empleado Ventanilla | **Regla:** RP-17 (sin columnas de riesgo)
```sql
CREATE VIEW v_cuentas_ventanilla AS
  SELECT numero_cuenta, id_tipo_cuenta, id_titular, tipo_titular,
         saldo_actual, id_moneda, id_estado_cuenta, fecha_apertura
  FROM cuenta_bancaria;
  -- Sin columnas de análisis de riesgo ni historial de crédito
```

### Vista: v_transferencias_supervisor
**Rol:** Supervisor Empresa | **Regla:** RP-20
```sql
CREATE VIEW v_transferencias_supervisor AS
  SELECT t.id_transferencia, t.cuenta_origen, t.cuenta_destino, t.monto,
         t.id_estado_transferencia, t.fecha_creacion, t.fecha_vencimiento
  FROM transferencia t
  WHERE t.requiere_aprobacion = TRUE
    AND t.id_estado_transferencia = (SELECT id FROM cat_estado_transferencia WHERE nombre_estado = 'En Espera de Aprobacion')
    AND t.cuenta_origen IN (
      SELECT cb.numero_cuenta FROM cuenta_bancaria cb
      JOIN cliente_empresa ce ON cb.id_titular = ce.nit
      WHERE ce.id_usuario = @id_empresa_sesion
    );
```

### Vista: v_prestamos_analista
**Rol:** Analista Interno | **Regla:** RP-21
```sql
CREATE VIEW v_prestamos_analista AS
  SELECT * FROM prestamo; -- Acceso completo a todos los préstamos
```

### Vista: v_bitacora_analista
**Rol:** Analista Interno | **Regla:** RP-21
```sql
CREATE VIEW v_bitacora_analista AS
  SELECT * FROM bitacora_cola ORDER BY fecha_hora_operacion DESC;
  -- Solo lectura; sin permisos de INSERT/UPDATE/DELETE
```

---

## 4. MATRIZ DE PERMISOS POR TABLA

S=SELECT, I=INSERT, U=UPDATE, D=DELETE, E=EXECUTE (SP), —=Sin acceso

| Tabla / SP | Cliente PN | Cliente Emp | Ventanilla | Comercial | Emp Empresa | Supervisor | Analista |
|---|---|---|---|---|---|---|---|
| usuario | — | — | — | S | — | — | S |
| cliente_persona_natural | S (propio) | S (propio) | S | S,I,U |  |  | S |
| cliente_empresa | — | S (propio) |  | S,I,U | S (propio) | S (propio) | S |
| cuenta_bancaria | S (vista) | S (vista) | S (vista) |  | S (vista) | S (vista) | S |
| prestamo | S (vista) | S (vista) | — | — | — |  | S (vista) |
| transferencia | S,I (vista) | S (vista) | — | — | S,I (vista) | S (vista) | S |
| producto_bancario | S | S | S | S,I,U | S | S | S |
| bitacora_cola | — | — | — | — | — | — | S (vista) |
| sp_ejecutar_transferencia | E | E |  |  | E |  |  |
| sp_desembolsar_prestamo |  |  |  |  |  |  | E |
| sp_aprobar_prestamo | — | — | — |  |  |  | E |
| sp_rechazar_prestamo | — | — | — | — | — | — | E |
| sp_aprobar_transferencia | — | E | — | — | — | E | — |
| sp_rechazar_transferencia |  | E |  |  |  | E |  |
| sp_bloquear_cuenta | — | — | E | — |  |  | E |
| sp_registrar_bitacora | — | — | — | — | — | — | — (solo sistema) |

---

## 5. VARIABLE DE SESIÓN Y CONTEXTO DE USUARIO

Al inicio de cada conexión autenticada, la aplicación establece variables de sesión en MySQL:

```sql
-- Establecer contexto de usuario al conectar
SET @id_usuario_sesion = <id_del_usuario_autenticado>;
SET @rol_sesion        = <nombre_del_rol>;
SET @id_empresa_sesion = <nit_de_empresa_si_aplica>; -- NULL para personas naturales
```

Estas variables son consumidas por triggers y stored procedures para:
- Validar el rol del ejecutor en transiciones de estado
- Registrar el actor en la bitácora
- Filtrar datos en vistas dinámicas

---

## 6. PROTECCIÓN DE LA BITÁCORA

| Medida | Descripción |
|---|---|
| Solo INSERT | El usuario db_sistema tiene únicamente permiso INSERT en bitacora_cola. Ningún rol tiene UPDATE ni DELETE. |
| MongoDB append-only | La colección bitacora_operaciones en MongoDB se configura con rol readWrite solo para inserciones; las actualizaciones y eliminaciones están bloqueadas a nivel de rol de MongoDB. |
| Acceso de lectura restringido | Solo db_analista puede leer la bitácora, a través de la vista v_bitacora_analista. |
| Integridad referencial | Cada registro incluye id_usuario y rol_usuario para trazabilidad completa del actor. |

---

## 7. RESUMEN DE COBERTURA DE SEGURIDAD

| Regla de Proceso | Mecanismo de Seguridad | Estado |
|---|---|---|
| RP-15: Cliente PN solo ve sus datos | Vista v_*_cliente_pn filtrada por @id_usuario_sesion | Cubierto |
| RP-16: Empresa solo ve sus datos | Vista v_*_empresa filtrada por @id_usuario_sesion | Cubierto |
| RP-17: Ventanilla sin datos de riesgo | Vista v_cuentas_ventanilla sin columnas sensibles | Cubierto |
| RP-18: Comercial no modifica saldos | Sin permisos UPDATE en cuenta_bancaria | Cubierto |
| RP-19: Emp Empresa solo su empresa | Vista filtrada por empresa de sesión | Cubierto |
| RP-20: Supervisor aprueba transferencias | EXECUTE solo en sp_aprobar/rechazar_transferencia | Cubierto |
| RP-21: Analista no modifica saldos | Sin permisos UPDATE directo en cuenta_bancaria | Cubierto |
