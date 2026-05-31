
# Modelo de Datos Relacional — Sistema de Gestión Bancaria
## FASE 1: Traducción DDD → Modelo Relacional (MySQL)

**Proyecto:** Sistema Core Transaccional y de Gestión de Información Bancaria
**Metodología:** Domain-Driven Design → Modelo Relacional
**Documentos base:** Banco.md  SDD/01_Domain/domain_analysis.md
**Fecha:** 2026-05-03

---

## PRINCIPIOS DE TRADUCCIÓN DDD  RELACIONAL

| Concepto DDD | Traducción Relacional |
|---|---|
| Aggregate Root | Tabla principal del contexto (PK propia) |
| Entity | Tabla con PK propia y FK hacia su Aggregate Root |
| Value Object simple | Columnas con CHECK constraints en la tabla del agregado |
| Value Object enumerado | Tabla catálogo independiente (cat_*) con FK |
| Relación entre BCs | Solo por ID natural; sin JOIN directo entre agregados de distinto BC |
| Invariante fuerte | CHECK constraint, UNIQUE, NOT NULL, TRIGGER de validación |
| Regla de proceso | TRIGGER o STORED PROCEDURE en la BD |
| Evento de dominio | Registro automático en bitácora (NoSQL) vía trigger |

---

---

## BC-01: IDENTIDAD Y ACCESO

### Aggregate Root: Usuario

**Tabla:** `usuario`

| Columna | Tipo | Restricciones | Origen DDD |
|---|---|---|---|
| id_usuario | INT UNSIGNED AUTO_INCREMENT | PK, NOT NULL | Identidad de entidad |
| id_relacionado | VARCHAR(30) | NULL | Referencia al ID del cliente asociado (persona/empresa) |
| nombre_completo | VARCHAR(200) | NOT NULL | Value Object: Nombre Completo |
| id_identificacion | VARCHAR(30) | NOT NULL, UNIQUE | Value Object: Identificación (INV-01) |
| correo_electronico | VARCHAR(150) | NOT NULL, CHECK (correo LIKE '%@%.%') | Value Object: Correo (INV-02) |
| telefono | VARCHAR(15) | NOT NULL, CHECK (CHAR_LENGTH(telefono) BETWEEN 7 AND 15) | Value Object: Teléfono (INV-03) |
| fecha_nacimiento | DATE | NULL | Value Object: Fecha de Nacimiento |
| direccion | VARCHAR(300) | NULL | Value Object: Dirección |
| id_rol | TINYINT UNSIGNED | NOT NULL, FK → cat_rol | Value Object: Rol del Sistema (INV-05) |
| id_estado_usuario | TINYINT UNSIGNED | NOT NULL, FK  cat_estado_usuario | Value Object: Estado de Usuario |
| fecha_creacion | DATETIME | NOT NULL, DEFAULT NOW() | Auditoría |
| fecha_modificacion | DATETIME | NULL, ON UPDATE NOW() | Auditoría |

**Índices:** UNIQUE(id_identificacion), UNIQUE(correo_electronico), INDEX(id_rol), INDEX(id_estado_usuario)

### Tablas Catálogo de BC-01

**Tabla:** `cat_rol`

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| id_rol | TINYINT UNSIGNED | PK, NOT NULL | Identificador del rol |
| nombre_rol | VARCHAR(60) | NOT NULL, UNIQUE | Nombre del rol |
| descripcion | VARCHAR(300) | NULL | Descripción del rol |

**Valores iniciales:** Cliente Persona Natural, Cliente Empresa, Empleado Ventanilla, Empleado Comercial, Empleado Empresa, Supervisor Empresa, Analista Interno

---

**Tabla:** `cat_estado_usuario`

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| id_estado_usuario | TINYINT UNSIGNED | PK, NOT NULL | Identificador del estado |
| nombre_estado | VARCHAR(30) | NOT NULL, UNIQUE | Nombre del estado |

**Valores iniciales:** Activo, Inactivo

### Restricciones e Invariantes de BC-01

| ID | Invariante | Implementación en BD |
|---|---|---|
| INV-01 | id_identificacion único en todo el sistema | UNIQUE(id_identificacion) en tabla usuario |
| INV-02 | Correo debe contener @ y dominio | CHECK (correo_electronico LIKE '%@%.%') |
| INV-03 | Teléfono entre 7 y 15 dígitos | CHECK (CHAR_LENGTH(telefono) BETWEEN 7 AND 15) |
| INV-04 | Usuario inactivo no puede operar | TRIGGER before_operacion_usuario valida id_estado_usuario = Activo |
| INV-05 | Rol es valor de catálogo cerrado | FK id_rol → cat_rol(id_rol) con ON DELETE RESTRICT |

---

## BC-02: GESTIÓN DE CLIENTES

### Aggregate Root: ClientePersonaNatural

**Tabla:** `cliente_persona_natural`

| Columna | Tipo | Restricciones | Origen DDD |
|---|---|---|---|
| id_identificacion | VARCHAR(30) | PK, NOT NULL | Identidad natural del agregado (INV-01) |
| tipo_identificacion | VARCHAR(20) | NOT NULL | Cédula, DNI, Pasaporte, etc. |
| nombre_completo | VARCHAR(200) | NOT NULL | Value Object: Nombre Completo |
| correo_electronico | VARCHAR(150) | NOT NULL, UNIQUE, CHECK (correo LIKE '%@%.%') | Value Object: Correo (INV-02) |
| telefono | VARCHAR(15) | NOT NULL, CHECK (CHAR_LENGTH(telefono) BETWEEN 7 AND 15) | Value Object: Teléfono (INV-03) |
| fecha_nacimiento | DATE | NOT NULL | Value Object: Fecha de Nacimiento |
| direccion | VARCHAR(300) | NOT NULL | Value Object: Dirección |
| id_usuario | INT UNSIGNED | NOT NULL, UNIQUE, FK  usuario(id_usuario) | Vínculo con BC-01 |
| fecha_registro | DATETIME | NOT NULL, DEFAULT NOW() | Auditoría |
| fecha_modificacion | DATETIME | NULL | Auditoría |

**Restricción de mayoría de edad (INV-06):** Implementada en TRG-02 (trg_before_insert_cliente_pn) mediante `TIMESTAMPDIFF(YEAR, fecha_nacimiento, CURDATE()) >= 18`. **Nota de implementación:** MySQL 8 no permite funciones no deterministas como `CURDATE()` en CHECK constraints (ERROR 3814), por lo que esta validación vive en el trigger y no como CHECK en la tabla.

**Índices:** PK(id_identificacion), UNIQUE(correo_electronico), UNIQUE(id_usuario)

### Aggregate Root: ClienteEmpresa

**Tabla:** `cliente_empresa`

| Columna | Tipo | Restricciones | Origen DDD |
|---|---|---|---|
| nit | VARCHAR(30) | PK, NOT NULL | Identidad natural del agregado (INV-08) |
| razon_social | VARCHAR(200) | NOT NULL | Value Object: Razón Social |
| correo_electronico | VARCHAR(150) | NOT NULL, UNIQUE, CHECK (correo LIKE '%@%.%') | Value Object: Correo (INV-02) |
| telefono | VARCHAR(15) | NOT NULL, CHECK (CHAR_LENGTH(telefono) BETWEEN 7 AND 15) | Value Object: Teléfono (INV-03) |
| direccion | VARCHAR(300) | NOT NULL | Value Object: Dirección |
| id_representante_legal | VARCHAR(30) | NOT NULL, FK → cliente_persona_natural(id_identificacion) | Representante Legal obligatorio (INV-07) |
| id_usuario | INT UNSIGNED | NOT NULL, UNIQUE, FK → usuario(id_usuario) | Vínculo con BC-01 |
| fecha_registro | DATETIME | NOT NULL, DEFAULT NOW() | Auditoría |
| fecha_modificacion | DATETIME | NULL | Auditoría |

**Índices:** PK(nit), UNIQUE(correo_electronico), UNIQUE(id_usuario), INDEX(id_representante_legal)

**Nota INV-07:** La FK id_representante_legal es NOT NULL y con ON DELETE RESTRICT, garantizando que nunca exista una empresa sin representante legal registrado.

### Restricciones e Invariantes de BC-02

| ID | Invariante | Implementación en BD |
|---|---|---|
| INV-06 | Cliente Persona Natural debe ser mayor de edad | CHECK (TIMESTAMPDIFF(YEAR, fecha_nacimiento, CURDATE()) >= 18) |
| INV-07 | Empresa requiere Representante Legal válido | FK NOT NULL id_representante_legal → cliente_persona_natural |
| INV-08 | NIT único en todo el sistema | PK(nit) en cliente_empresa |

---

## BC-03: CUENTAS BANCARIAS

### Aggregate Root: CuentaBancaria

**Tabla:** `cuenta_bancaria`

| Columna | Tipo | Restricciones | Origen DDD |
|---|---|---|---|
| numero_cuenta | VARCHAR(30) | PK, NOT NULL | Identidad natural del agregado (INV-12) |
| id_tipo_cuenta | TINYINT UNSIGNED | NOT NULL, FK → cat_tipo_cuenta | Value Object: Tipo de Cuenta |
| id_titular | VARCHAR(30) | NOT NULL | ID del cliente titular (persona natural o empresa) |
| tipo_titular | ENUM('PERSONA_NATURAL','EMPRESA') | NOT NULL | Discriminador del tipo de titular |
| saldo_actual | DECIMAL(18,2) | NOT NULL, DEFAULT 0.00, CHECK (saldo_actual >= 0) | Value Object: Saldo (INV-09) |
| id_moneda | TINYINT UNSIGNED | NOT NULL, FK  cat_moneda | Value Object: Moneda (INV-13) |
| id_estado_cuenta | TINYINT UNSIGNED | NOT NULL, FK → cat_estado_cuenta | Value Object: Estado de Cuenta |
| fecha_apertura | DATE | NOT NULL | Value Object: Fecha de Apertura (inmutable) |
| id_usuario_apertura | INT UNSIGNED | NOT NULL, FK → usuario(id_usuario) | Quién abrió la cuenta (trazabilidad) |
| fecha_creacion | DATETIME | NOT NULL, DEFAULT NOW() | Auditoría |
| fecha_modificacion | DATETIME | NULL | Auditoría |

**Índices:** PK(numero_cuenta), INDEX(id_titular, tipo_titular), INDEX(id_estado_cuenta)

**Nota INV-13:** La columna id_moneda no puede modificarse tras la apertura. Se implementa con TRIGGER before_update_cuenta que rechaza cambios en id_moneda.

### Tablas Catálogo de BC-03

**Tabla:** `cat_tipo_cuenta`

| Columna | Tipo | Restricciones |
|---|---|---|
| id_tipo_cuenta | TINYINT UNSIGNED | PK, NOT NULL |
| nombre_tipo | VARCHAR(50) | NOT NULL, UNIQUE |

**Valores iniciales:** Ahorros, Corriente, Nómina, Empresarial

---

**Tabla:** `cat_moneda`

| Columna | Tipo | Restricciones |
|---|---|---|
| id_moneda | TINYINT UNSIGNED | PK, NOT NULL |
| codigo_iso | CHAR(3) | NOT NULL, UNIQUE |
| nombre_moneda | VARCHAR(50) | NOT NULL |

**Valores iniciales:** COP (Peso Colombiano), USD (Dólar), EUR (Euro)

---

**Tabla:** `cat_estado_cuenta`

| Columna | Tipo | Restricciones |
|---|---|---|
| id_estado_cuenta | TINYINT UNSIGNED | PK, NOT NULL |
| nombre_estado | VARCHAR(30) | NOT NULL, UNIQUE |

**Valores iniciales:** Activa, Bloqueada, Cerrada

### Restricciones e Invariantes de BC-03

| ID | Invariante | Implementación en BD |
|---|---|---|
| INV-09 | Saldo nunca negativo | CHECK (saldo_actual >= 0) en cuenta_bancaria |
| INV-10 | No operar cuenta bloqueada/cerrada | TRIGGER before_operacion_cuenta valida id_estado_cuenta = Activa |
| INV-11 | No abrir cuenta a usuario inactivo | TRIGGER before_insert_cuenta valida estado del usuario en BC-01 |
| INV-12 | Número de cuenta único | PK(numero_cuenta) |
| INV-13 | Moneda inmutable tras apertura | TRIGGER before_update_cuenta rechaza cambio en id_moneda |

---

## BC-04: PRÉSTAMOS Y CRÉDITOS

### Aggregate Root: Prestamo

**Tabla:** `prestamo`

| Columna | Tipo | Restricciones | Origen DDD |
|---|---|---|---|
| id_prestamo | INT UNSIGNED AUTO_INCREMENT | PK, NOT NULL | Identidad del agregado |
| id_tipo_prestamo | TINYINT UNSIGNED | NOT NULL, FK → cat_tipo_prestamo | Value Object: Tipo de Préstamo |
| id_cliente_solicitante | VARCHAR(30) | NOT NULL | ID del cliente (persona natural o empresa) |
| tipo_cliente | ENUM('PERSONA_NATURAL','EMPRESA') | NOT NULL | Discriminador del tipo de cliente |
| monto_solicitado | DECIMAL(18,2) | NOT NULL, CHECK (monto_solicitado > 0) | Value Object: Monto Solicitado |
| monto_aprobado | DECIMAL(18,2) | NULL, CHECK (monto_aprobado IS NULL OR monto_aprobado > 0) | Value Object: Monto Aprobado (INV-17) |
| tasa_interes | DECIMAL(6,4) | NULL, CHECK (tasa_interes IS NULL OR tasa_interes > 0) | Value Object: Tasa de Interés |
| plazo_meses | SMALLINT UNSIGNED | NULL, CHECK (plazo_meses IS NULL OR plazo_meses > 0) | Value Object: Plazo |
| id_estado_prestamo | TINYINT UNSIGNED | NOT NULL, FK → cat_estado_prestamo | Value Object: Estado de Préstamo |
| id_usuario_solicitante | INT UNSIGNED | NOT NULL, FK  usuario(id_usuario) | Quién solicitó |
| id_analista_aprobador | INT UNSIGNED | NULL, FK  usuario(id_usuario) | Analista que aprobó/rechazó (INV-14) |
| fecha_solicitud | DATETIME | NOT NULL, DEFAULT NOW() | Trazabilidad |
| fecha_aprobacion | DATETIME | NULL | Registrada al aprobar/rechazar (RP-03) |
| fecha_desembolso | DATETIME | NULL | Registrada al desembolsar |
| cuenta_destino_desembolso | VARCHAR(30) | NULL, FK  cuenta_bancaria(numero_cuenta) | Cuenta destino (INV-18) |
| fecha_modificacion | DATETIME | NULL | Auditoría |

**Índices:** PK(id_prestamo), INDEX(id_cliente_solicitante, tipo_cliente), INDEX(id_estado_prestamo), INDEX(id_analista_aprobador)

### Tablas Catálogo de BC-04

**Tabla:** `cat_tipo_prestamo`

| Columna | Tipo | Restricciones |
|---|---|---|
| id_tipo_prestamo | TINYINT UNSIGNED | PK, NOT NULL |
| nombre_tipo | VARCHAR(60) | NOT NULL, UNIQUE |

**Valores iniciales:** Personal, Hipotecario, Vehicular, Empresarial, Libre Inversión

---

**Tabla:** `cat_estado_prestamo`

| Columna | Tipo | Restricciones |
|---|---|---|
| id_estado_prestamo | TINYINT UNSIGNED | PK, NOT NULL |
| nombre_estado | VARCHAR(40) | NOT NULL, UNIQUE |
| es_estado_final | BOOLEAN | NOT NULL, DEFAULT FALSE | Indica si el estado es terminal |

**Valores iniciales:** En Estudio (no final), Aprobado (no final), Rechazado (final), Desembolsado (final)

### Tabla de Transiciones de Estado de Préstamo

Implementa la máquina de estados de INV-15 directamente en la BD.

**Tabla:** `prestamo_transicion_estado`

| Columna | Tipo | Restricciones |
|---|---|---|
| id_estado_origen | TINYINT UNSIGNED | PK parte 1, FK → cat_estado_prestamo |
| id_estado_destino | TINYINT UNSIGNED | PK parte 2, FK → cat_estado_prestamo |
| id_rol_requerido | TINYINT UNSIGNED | NOT NULL, FK → cat_rol | Rol que puede ejecutar esta transición |

**Uso:** TRIGGER before_update_prestamo consulta esta tabla para validar que la transición de estado sea permitida (INV-15) y que el usuario que la ejecuta tenga el rol correcto (INV-14).

**Transiciones válidas:**

| Estado Origen | Estado Destino | Rol Requerido |
|---|---|---|
| En Estudio | Aprobado | Analista Interno |
| En Estudio | Rechazado | Analista Interno |
| Aprobado | Desembolsado | Analista Interno |

### Restricciones e Invariantes de BC-04

| ID | Invariante | Implementación en BD |
|---|---|---|
| INV-14 | Solo Analista Interno aprueba/rechaza préstamos | TRIGGER before_update_prestamo valida rol del usuario en prestamo_transicion_estado |
| INV-15 | Transición de estados estricta | TRIGGER before_update_prestamo consulta prestamo_transicion_estado; rechaza si no existe la transición |
| INV-16 | No desembolsar préstamo rechazado | Cubierto por INV-15: Rechazado no tiene transición a Desembolsado |
| INV-17 | Monto aprobado > 0 | CHECK (monto_aprobado IS NULL OR monto_aprobado > 0) |
| INV-18 | Cuenta destino activa y del cliente | TRIGGER before_desembolso valida estado de cuenta y titularidad |
| INV-19 | Cliente solicitante activo y registrado | TRIGGER before_insert_prestamo valida estado del usuario en BC-01 |
| RP-03 | Registrar fecha_aprobacion al aprobar | TRIGGER before_update_prestamo asigna NOW() a fecha_aprobacion |
| RP-04 | Desembolso actualiza saldo y bitácora | TRIGGER after_update_prestamo (estado=Desembolsado) actualiza saldo en cuenta_bancaria |
| RP-05 | Estado Desembolsado solo tras crédito exitoso | Lógica transaccional en STORED PROCEDURE sp_desembolsar_prestamo |

---

## BC-05: TRANSFERENCIAS

### Aggregate Root: Transferencia

**Tabla:** `transferencia`

| Columna | Tipo | Restricciones | Origen DDD |
|---|---|---|---|
| id_transferencia | INT UNSIGNED AUTO_INCREMENT | PK, NOT NULL | Identidad del agregado (INV-24) |
| cuenta_origen | VARCHAR(30) | NOT NULL, FK  cuenta_bancaria(numero_cuenta) | Cuenta debitada |
| cuenta_destino | VARCHAR(30) | NOT NULL, FK  cuenta_bancaria(numero_cuenta) | Cuenta acreditada |
| monto | DECIMAL(18,2) | NOT NULL, CHECK (monto > 0) | Value Object: Monto (INV-20) |
| id_estado_transferencia | TINYINT UNSIGNED | NOT NULL, FK  cat_estado_transferencia | Value Object: Estado |
| id_usuario_creador | INT UNSIGNED | NOT NULL, FK → usuario(id_usuario) | Quién creó la transferencia |
| id_usuario_aprobador | INT UNSIGNED | NULL, FK  usuario(id_usuario) | Quién aprobó/rechazó (INV-25) |
| fecha_creacion | DATETIME | NOT NULL, DEFAULT NOW() | Value Object: Fecha de Creación (inmutable) |
| fecha_aprobacion | DATETIME | NULL | Value Object: Fecha de Aprobación |
| fecha_vencimiento | DATETIME | NOT NULL | Calculada: fecha_creacion + 60 minutos (RP-12) |
| requiere_aprobacion | BOOLEAN | NOT NULL, DEFAULT FALSE | TRUE si supera umbral (RP-08) |
| saldo_origen_antes | DECIMAL(18,2) | NULL | Snapshot para bitácora (RP-23) |
| saldo_destino_antes | DECIMAL(18,2) | NULL | Snapshot para bitácora (RP-23) |
| saldo_origen_despues | DECIMAL(18,2) | NULL | Snapshot para bitácora (RP-23) |
| saldo_destino_despues | DECIMAL(18,2) | NULL | Snapshot para bitácora (RP-23) |

**Índices:** PK(id_transferencia), INDEX(cuenta_origen), INDEX(cuenta_destino), INDEX(id_estado_transferencia), INDEX(fecha_vencimiento)

**Nota:** cuenta_origen != cuenta_destino se garantiza con CHECK (cuenta_origen <> cuenta_destino).

### Tabla de Configuración de Umbral

**Tabla:** `config_umbral_transferencia`

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| id_config | TINYINT UNSIGNED | PK, NOT NULL | Identificador |
| monto_umbral | DECIMAL(18,2) | NOT NULL, CHECK (monto_umbral > 0) | Monto a partir del cual se requiere aprobación |
| id_moneda | TINYINT UNSIGNED | NOT NULL, FK → cat_moneda | Moneda del umbral |
| vigente | BOOLEAN | NOT NULL, DEFAULT TRUE | Solo un registro puede estar vigente |
| fecha_modificacion | DATETIME | NOT NULL | Auditoría |

**Uso:** TRIGGER before_insert_transferencia consulta esta tabla para determinar si requiere_aprobacion = TRUE.

---

### Tablas Catálogo de BC-05

**Tabla:** `cat_estado_transferencia`

| Columna | Tipo | Restricciones |
|---|---|---|
| id_estado_transferencia | TINYINT UNSIGNED | PK, NOT NULL |
| nombre_estado | VARCHAR(40) | NOT NULL, UNIQUE |
| es_estado_final | BOOLEAN | NOT NULL, DEFAULT FALSE |

**Valores iniciales:** Pendiente (no final), En Espera de Aprobacion (no final), Aprobada (no final), Ejecutada (final), Rechazada (final), Vencida (final)

### Tabla de Transiciones de Estado de Transferencia

**Tabla:** `transferencia_transicion_estado`

| Columna | Tipo | Restricciones |
|---|---|---|
| id_estado_origen | TINYINT UNSIGNED | PK parte 1, FK  cat_estado_transferencia |
| id_estado_destino | TINYINT UNSIGNED | PK parte 2, FK → cat_estado_transferencia |
| id_rol_requerido | TINYINT UNSIGNED | NOT NULL, FK → cat_rol |

**Transiciones válidas:**

| Estado Origen | Estado Destino | Rol Requerido |
|---|---|---|
| Pendiente | Ejecutada | Empleado Empresa / Cliente Persona Natural |
| Pendiente | En Espera de Aprobacion | Sistema (trigger automático) |
| En Espera de Aprobacion | Aprobada | Supervisor Empresa |
| En Espera de Aprobacion | Rechazada | Supervisor Empresa |
| En Espera de Aprobacion | Vencida | Sistema (trigger automático) |
| Aprobada | Ejecutada | Sistema (trigger automático) |

### Restricciones e Invariantes de BC-05

| ID | Invariante | Implementación en BD |
|---|---|---|
| INV-20 | Monto > 0 | CHECK (monto > 0) en transferencia |
| INV-21 | Saldo suficiente en cuenta origen | TRIGGER before_ejecutar_transferencia valida saldo_actual >= monto |
| INV-22 | Cuentas no bloqueadas | TRIGGER before_insert_transferencia valida estado de ambas cuentas |
| INV-23 | Transferencia vencida no puede aprobarse | TRIGGER before_update_transferencia rechaza si estado actual = Vencida |
| INV-24 | ID de transferencia único | PK AUTO_INCREMENT |
| INV-25 | Solo Supervisor aprueba transferencias de alto valor | TRIGGER before_update_transferencia valida rol en transferencia_transicion_estado |
| INV-26 | Impacto financiero atómico | STORED PROCEDURE sp_ejecutar_transferencia en transacción única |
| RP-07 | Transferencia sin umbral se ejecuta directamente | TRIGGER after_insert_transferencia: si NOT requiere_aprobacion, llama sp_ejecutar_transferencia |
| RP-08 | Supera umbral  En Espera de Aprobacion | TRIGGER before_insert_transferencia asigna estado según umbral |
| RP-12 | Vencimiento automático a 60 minutos | EVENT SCHEDULER o TRIGGER periódico actualiza estado a Vencida cuando NOW() > fecha_vencimiento |
| RP-13 | Vencimiento registrado en bitácora | TRIGGER after_update_transferencia (estado=Vencida) inserta en bitácora con motivo |
| RP-14 | Ejecución atómica débito/crédito | sp_ejecutar_transferencia usa START TRANSACTION / COMMIT / ROLLBACK |

---

## BC-06: AUDITORÍA Y BITÁCORA

### Aggregate Root: RegistroBitacora (NoSQL — MongoDB)

La bitácora es un almacén **NoSQL de solo inserción**. No existe tabla relacional para este contexto.
Se documenta el esquema del documento para MongoDB.

**Colección:** `bitacora_operaciones`

| Campo | Tipo BSON | Obligatorio | Descripción |
|---|---|---|---|
| _id | ObjectId | Sí (auto) | Identificador único del documento |
| id_bitacora | String | Sí | ID legible: UUID v4 generado por trigger |
| tipo_operacion | String | Sí | TRANSFERENCIA, PRESTAMO, APERTURA_CUENTA, BLOQUEO_CUENTA, VENCIMIENTO, DESEMBOLSO |
| fecha_hora_operacion | Date (ISODate) | Sí | Timestamp exacto de la operación |
| id_usuario | Int | Sí | FK lógica a usuario(id_usuario) |
| rol_usuario | String | Sí | Snapshot del rol en el momento de la operación |
| id_producto_afectado | String | Sí | ID del producto (numero_cuenta, id_prestamo, id_transferencia) |
| tipo_producto | String | Sí | CUENTA, PRESTAMO, TRANSFERENCIA |
| datos_detalle | Object | Sí | Snapshot JSON con estado antes/después |

**Estructura de datos_detalle según tipo_operacion:**

**TRANSFERENCIA:**
`json
{
  "cuenta_origen": "string",
  "cuenta_destino": "string",
  "monto": 0.00,
  "saldo_origen_antes": 0.00,
  "saldo_origen_despues": 0.00,
  "saldo_destino_antes": 0.00,
  "saldo_destino_despues": 0.00,
  "estado_anterior": "string",
  "estado_nuevo": "string"
}

## BC-06: AUDITORÍA Y BITÁCORA

### Aggregate Root: RegistroBitacora (NoSQL)

La bitácora vive en una colección NoSQL (MongoDB). No tiene tabla relacional.
Sin embargo, se define una tabla relacional auxiliar para metadatos de auditoría sincrónica.

**Colección NoSQL:** `bitacora_operaciones`

| Campo | Tipo | Restricciones | Origen DDD |
|---|---|---|---|
| _id / id_bitacora | ObjectId / UUID | PK, NOT NULL, UNIQUE | Identidad del registro (INV-29) |
| tipo_operacion | String | NOT NULL | Value Object: Tipo de Operación |
| fecha_hora_operacion | ISODate | NOT NULL | Value Object: Timestamp |
| id_usuario | Integer | NOT NULL | Value Object: Referencia de Actor |
| rol_usuario | String | NOT NULL | Value Object: Referencia de Actor |
| id_producto_afectado | String | NOT NULL | ID del recurso afectado (cuenta, préstamo, transferencia) |
| tipo_producto | String | NOT NULL | Discriminador: CUENTA, PRESTAMO, TRANSFERENCIA |
| datos_detalle | Object (JSON) | NOT NULL | Value Object: Datos de Detalle (snapshot antes/después) |

**Índices NoSQL:** id_bitacora (único), id_usuario, tipo_operacion, fecha_hora_operacion, id_producto_afectado

### Estructura del campo datos_detalle por tipo de operación

**Transferencia ejecutada (RP-23):**
```json
{
  "cuenta_origen": "001-123456",  "cuenta_destino": "001-789012",
  "monto": 5000.00,
  "saldo_origen_antes": 12000.00,  "saldo_origen_despues": 7000.00,
  "saldo_destino_antes": 3000.00,  "saldo_destino_despues": 8000.00
}
```

**Cambio de estado de préstamo (RP-24):**
```json
{
  "id_prestamo": 42,  "estado_anterior": "En Estudio",  "estado_nuevo": "Aprobado",
  "monto_aprobado": 15000000.00,  "tasa_interes": 0.1200,  "plazo_meses": 36
}
```

**Vencimiento de transferencia (RP-25):**
```json
{
  "id_transferencia": 99,  "estado_anterior": "En Espera de Aprobacion",
  "estado_nuevo": "Vencida",  "motivo": "Tiempo de aprobacion expirado",
  "fecha_creacion": "2026-05-03T10:00:00Z",  "fecha_vencimiento": "2026-05-03T11:00:00Z"
}
```

### Restricciones e Invariantes de BC-06

| ID | Invariante | Implementación |
|---|---|---|
| INV-27 | Registros inmutables | Colección NoSQL sin operaciones update/delete; permisos de BD solo permiten insert |
| INV-28 | Toda operación crítica genera registro | TRIGGER after_update en cuenta_bancaria, prestamo y transferencia llama al insertor de bitácora |
| INV-29 | ID de bitácora único | _id ObjectId generado por MongoDB (garantía nativa) |

---

## BC-07: PRODUCTOS BANCARIOS

### Aggregate Root: ProductoBancario

**Tabla:** `producto_bancario`

| Columna | Tipo | Restricciones | Origen DDD |
|---|---|---|---|
| codigo_producto | VARCHAR(20) | PK, NOT NULL | Identidad natural del agregado |
| nombre_producto | VARCHAR(100) | NOT NULL, UNIQUE | Value Object: Nombre de Producto |
| id_categoria | TINYINT UNSIGNED | NOT NULL, FK  cat_categoria_producto | Value Object: Categoría |
| requiere_aprobacion | BOOLEAN | NOT NULL, DEFAULT FALSE | Value Object: Requiere Aprobación |
| activo | BOOLEAN | NOT NULL, DEFAULT TRUE | Estado del producto en catálogo |
| fecha_creacion | DATETIME | NOT NULL, DEFAULT NOW() | Auditoría |
| fecha_modificacion | DATETIME | NULL | Auditoría |

**Índices:** PK(codigo_producto), UNIQUE(nombre_producto), INDEX(id_categoria)

---

**Tabla:** `cat_categoria_producto`

| Columna | Tipo | Restricciones |
|---|---|---|
| id_categoria | TINYINT UNSIGNED | PK, NOT NULL |
| nombre_categoria | VARCHAR(60) | NOT NULL, UNIQUE |

**Valores iniciales:** Cuenta, Crédito, Inversión, Seguro, Servicio

---

---

## DIAGRAMA DE RELACIONES ENTRE TABLAS

Las relaciones entre tablas respetan estrictamente los límites de cada Bounded Context.
Las FK que cruzan contextos usan solo identificadores naturales (VARCHAR/INT), nunca objetos completos.

```
BC-01: IDENTIDAD Y ACCESO
  cat_rol  usuario
  cat_estado_usuario ───────────────────► usuario

BC-02: GESTIÓN DE CLIENTES
  usuario ──────────────────────────────► cliente_persona_natural (id_usuario)
  usuario ──────────────────────────────► cliente_empresa (id_usuario)
  cliente_persona_natural ────► cliente_empresa (id_representante_legal)

BC-03: CUENTAS BANCARIAS
  cat_tipo_cuenta ──────────────────────► cuenta_bancaria
  cat_moneda  cuenta_bancaria
  cat_estado_cuenta ────────────────────► cuenta_bancaria
  usuario (BC-01)  cuenta_bancaria (id_usuario_apertura)
  [id_titular: VARCHAR  cliente_persona_natural.id_identificacion
               o cliente_empresa.nit, según tipo_titular]

BC-04: PRÉSTAMOS Y CRÉDITOS
  cat_tipo_prestamo ────────────────────► prestamo
  cat_estado_prestamo ──────► prestamo
  usuario (BC-01)  prestamo (id_usuario_solicitante)
  usuario (BC-01) ──────────────────────► prestamo (id_analista_aprobador)
  cuenta_bancaria (BC-03)  prestamo (cuenta_destino_desembolso)
  cat_estado_prestamo ─── prestamo_transicion_estado
  cat_rol (BC-01) ────── prestamo_transicion_estado

BC-05: TRANSFERENCIAS
  cuenta_bancaria (BC-03) ────► transferencia (cuenta_origen)
  cuenta_bancaria (BC-03) ────────► transferencia (cuenta_destino)
  cat_estado_transferencia  transferencia
  usuario (BC-01) ─► transferencia (id_usuario_creador)
  usuario (BC-01) ──────────── transferencia (id_usuario_aprobador)
  cat_moneda (BC-03) ───────────────────► config_umbral_transferencia
  cat_estado_transferencia ─────────────► transferencia_transicion_estado
  cat_rol (BC-01) ──────────────────────► transferencia_transicion_estado

BC-07: PRODUCTOS BANCARIOS
  cat_categoria_producto  producto_bancario
```

---

## INVENTARIO COMPLETO DE TABLAS

| # | Tabla | Bounded Context | Tipo | Aggregate Root |
|---|---|---|---|---|
| 1 | usuario | BC-01 | Entidad principal | Sí |
| 2 | cat_rol | BC-01 | Catálogo | No |
| 3 | cat_estado_usuario | BC-01 | Catálogo | No |
| 4 | cliente_persona_natural | BC-02 | Entidad principal | Sí |
| 5 | cliente_empresa | BC-02 | Entidad principal | Sí |
| 6 | cuenta_bancaria | BC-03 | Entidad principal | Sí |
| 7 | cat_tipo_cuenta | BC-03 | Catálogo | No |
| 8 | cat_moneda | BC-03 | Catálogo | No |
| 9 | cat_estado_cuenta | BC-03 | Catálogo | No |
| 10 | prestamo | BC-04 | Entidad principal | Sí |
| 11 | cat_tipo_prestamo | BC-04 | Catálogo | No |
| 12 | cat_estado_prestamo | BC-04 | Catálogo | No |
| 13 | prestamo_transicion_estado | BC-04 | Regla de negocio | No |
| 14 | transferencia | BC-05 | Entidad principal | Sí |
| 15 | cat_estado_transferencia | BC-05 | Catálogo | No |
| 16 | transferencia_transicion_estado | BC-05 | Regla de negocio | No |
| 17 | config_umbral_transferencia | BC-05 | Configuración | No |
| 18 | producto_bancario | BC-07 | Entidad principal | Sí |
| 19 | cat_categoria_producto | BC-07 | Catálogo | No |
| 20 | bitacora_operaciones | BC-06 | Colección NoSQL | Sí |

**Total tablas relacionales:** 19
**Total colecciones NoSQL:** 1

---

## INVENTARIO DE TRIGGERS Y STORED PROCEDURES

Todo el comportamiento de negocio vive en la base de datos, no en la aplicación.

### Triggers

| # | Nombre | Tabla | Evento | Propósito | Invariantes/Reglas |
|---|---|---|---|---|---|
| TRG-01 | trg_before_insert_usuario | usuario | BEFORE INSERT | Valida formato correo y teléfono | INV-02, INV-03 |
| TRG-02 | trg_before_insert_cliente_pn | cliente_persona_natural | BEFORE INSERT | Valida mayoría de edad | INV-06 |
| TRG-03 | trg_before_insert_cuenta | cuenta_bancaria | BEFORE INSERT | Valida que el usuario titular esté activo | INV-11 |
| TRG-04 | trg_before_update_cuenta | cuenta_bancaria | BEFORE UPDATE | Rechaza cambio de moneda; valida saldo >= 0 | INV-09, INV-13 |
| TRG-05 | trg_after_update_cuenta_saldo | cuenta_bancaria | AFTER UPDATE | Inserta registro en bitácora cuando cambia saldo_actual | INV-28, EVT-07 |
| TRG-06 | trg_before_insert_prestamo | prestamo | BEFORE INSERT | Valida cliente activo; asigna estado inicial 'En Estudio' | INV-19, RP-01 |
| TRG-07 | trg_before_update_prestamo | prestamo | BEFORE UPDATE | Valida transición de estado y rol del aprobador | INV-14, INV-15, INV-16 |
| TRG-08 | trg_after_update_prestamo | prestamo | AFTER UPDATE | Registra cambio de estado en bitácora; si Desembolsado llama sp_desembolsar | INV-28, RP-04, RP-06 |
| TRG-09 | trg_before_insert_transferencia | transferencia | BEFORE INSERT | Valida cuentas activas, monto > 0, asigna estado y fecha_vencimiento | INV-20, INV-22, RP-07, RP-08 |
| TRG-10 | trg_after_insert_transferencia | transferencia | AFTER INSERT | Si no requiere aprobación, llama sp_ejecutar_transferencia | RP-07 |
| TRG-11 | trg_before_update_transferencia | transferencia | BEFORE UPDATE | Valida transición de estado, rol aprobador, no vencida | INV-23, INV-25 |
| TRG-12 | trg_after_update_transferencia | transferencia | AFTER UPDATE | Registra en bitácora; si Ejecutada llama sp_ejecutar_transferencia | INV-28, RP-13 |
| TRG-13 | trg_vencimiento_transferencias | transferencia | EVENT (cada minuto) | Actualiza a Vencida las transferencias expiradas | RP-12, RP-13 |

### Stored Procedures

| # | Nombre | Propósito | Invariantes/Reglas |
|---|---|---|---|
| SP-01 | sp_ejecutar_transferencia(id_transferencia) | Débito en cuenta origen y crédito en cuenta destino en una sola transacción atómica | INV-21, INV-26, RP-14 |
| SP-02 | sp_desembolsar_prestamo(id_prestamo) | Valida cuenta destino, acredita monto aprobado, actualiza estado a Desembolsado | INV-17, INV-18, RP-04, RP-05 |
| SP-03 | sp_registrar_bitacora(tipo, id_usuario, id_producto, tipo_producto, detalle_json) | Inserta documento en colección NoSQL bitacora_operaciones | INV-27, INV-28, RP-22 |
| SP-04 | sp_bloquear_cuenta(numero_cuenta, id_usuario_ejecutor) | Cambia estado de cuenta a Bloqueada y registra en bitácora | INV-10, EVT-06 |
| SP-05 | sp_aprobar_prestamo(id_prestamo, id_analista, monto_aprobado, tasa, plazo) | Cambia estado a Aprobado, registra fecha y datos de aprobación | INV-14, RP-02, RP-03 |
| SP-06 | sp_rechazar_prestamo(id_prestamo, id_analista) | Cambia estado a Rechazado y registra en bitácora | INV-14, RP-02 |
| SP-07 | sp_aprobar_transferencia(id_transferencia, id_supervisor) | Cambia estado a Aprobada, valida rol Supervisor, registra fecha | INV-25, RP-09, RP-10 |
| SP-08 | sp_rechazar_transferencia(id_transferencia, id_supervisor) | Cambia estado a Rechazada y registra en bitácora | INV-25, RP-11 |

---

## RESTRICCIONES DE ACCESO POR ROL (Row-Level Security)

Las restricciones de visibilidad por rol se implementan como VIEWS en MySQL, una por rol y entidad.

| Vista | Rol | Filtro aplicado | Regla |
|---|---|---|---|
| v_cuentas_cliente_pn | Cliente Persona Natural | WHERE id_titular = SESSION_USER_ID AND tipo_titular = 'PERSONA_NATURAL' | RP-15 |
| v_prestamos_cliente_pn | Cliente Persona Natural | WHERE id_cliente_solicitante = SESSION_USER_ID AND tipo_cliente = 'PERSONA_NATURAL' | RP-15 |
| v_transferencias_cliente_pn | Cliente Persona Natural | WHERE id_usuario_creador = SESSION_USER_ID | RP-15 |
| v_cuentas_empresa | Cliente Empresa | WHERE id_titular = SESSION_EMPRESA_NIT AND tipo_titular = 'EMPRESA' | RP-16 |
| v_prestamos_empresa | Cliente Empresa | WHERE id_cliente_solicitante = SESSION_EMPRESA_NIT AND tipo_cliente = 'EMPRESA' | RP-16 |
| v_cuentas_ventanilla | Empleado Ventanilla | Todas las cuentas (solo lectura, sin columnas de riesgo) | RP-17 |
| v_transferencias_empresa_op | Empleado Empresa | WHERE cuenta_origen IN (cuentas de su empresa) | RP-19 |
| v_transferencias_supervisor | Supervisor Empresa | WHERE requiere_aprobacion = TRUE AND empresa del supervisor | RP-20 |
| v_prestamos_analista | Analista Interno | Todos los préstamos (lectura completa) | RP-21 |
| v_bitacora_analista | Analista Interno | Toda la bitácora (solo lectura) | RP-21 |

---

## RESUMEN DE COBERTURA DE INVARIANTES

| ID | Invariante | Mecanismo de BD | Estado |
|---|---|---|---|
| INV-01 | id_identificacion único | UNIQUE constraint | Cubierto |
| INV-02 | Correo con @ y dominio | CHECK + TRG-01 | Cubierto |
| INV-03 | Teléfono 7-15 dígitos | CHECK + TRG-01 | Cubierto |
| INV-04 | Usuario inactivo no opera | TRG-03, TRG-06, TRG-09 | Cubierto |
| INV-05 | Rol de catálogo cerrado | FK → cat_rol | Cubierto |
| INV-06 | Mayor de edad | CHECK TIMESTAMPDIFF + TRG-02 | Cubierto |
| INV-07 | Empresa con representante legal | FK NOT NULL id_representante_legal | Cubierto |
| INV-08 | NIT único | PK(nit) | Cubierto |
| INV-09 | Saldo no negativo | CHECK (saldo_actual >= 0) + TRG-04 | Cubierto |
| INV-10 | No operar cuenta bloqueada | TRG-09, SP-01, SP-02 | Cubierto |
| INV-11 | No cuenta a usuario inactivo | TRG-03 | Cubierto |
| INV-12 | Número de cuenta único | PK(numero_cuenta) | Cubierto |
| INV-13 | Moneda inmutable | TRG-04 | Cubierto |
| INV-14 | Solo Analista aprueba préstamos | TRG-07 + prestamo_transicion_estado | Cubierto |
| INV-15 | Transición de estados estricta | TRG-07 + prestamo_transicion_estado | Cubierto |
| INV-16 | No desembolsar rechazado | Cubierto por INV-15 (sin transición) | Cubierto |
| INV-17 | Monto aprobado > 0 | CHECK en columna monto_aprobado | Cubierto |
| INV-18 | Cuenta destino activa y del cliente | SP-02 valida antes de desembolsar | Cubierto |
| INV-19 | Cliente solicitante activo | TRG-06 | Cubierto |
| INV-20 | Monto transferencia > 0 | CHECK (monto > 0) | Cubierto |
| INV-21 | Saldo suficiente en origen | SP-01 valida antes de debitar | Cubierto |
| INV-22 | Cuentas no bloqueadas | TRG-09 | Cubierto |
| INV-23 | Vencida no puede aprobarse | TRG-11 | Cubierto |
| INV-24 | ID transferencia único | PK AUTO_INCREMENT | Cubierto |
| INV-25 | Solo Supervisor aprueba transferencias | TRG-11 + transferencia_transicion_estado | Cubierto |
| INV-26 | Impacto financiero atómico | SP-01 con transacción | Cubierto |
| INV-27 | Bitácora inmutable | Permisos solo INSERT en colección NoSQL | Cubierto |
| INV-28 | Toda operación crítica en bitácora | TRG-05, TRG-08, TRG-12 llaman SP-03 | Cubierto |
| INV-29 | ID bitácora único | ObjectId MongoDB (nativo) | Cubierto |

**Cobertura total: 29/29 invariantes implementadas en la base de datos.**

---

## RESUMEN EJECUTIVO  FASE 1

| Elemento | Cantidad |
|---|---|
| Bounded Contexts modelados | 7 |
| Tablas relacionales (MySQL) | 19 |
| Colecciones NoSQL (MongoDB) | 1 |
| Tablas catálogo | 9 |
| Tablas de máquina de estados | 2 |
| Triggers definidos | 13 |
| Stored Procedures definidos | 8 |
| Vistas por rol | 10 |
| Invariantes cubiertas en BD | 29/29 |
| Reglas de proceso cubiertas | 25/25 |

### Decisiones de diseño clave

1. **Discriminador de tipo titular/cliente:** Las tablas cuenta_bancaria y prestamo usan columna tipo_titular/tipo_cliente (ENUM) para referenciar polimórficamente a persona natural o empresa sin romper la integridad referencial.
2. **Máquinas de estado en BD:** Las tablas prestamo_transicion_estado y transferencia_transicion_estado codifican las transiciones válidas como datos, no como lógica de aplicación. Los triggers las consultan para validar cada cambio de estado.
3. **Snapshots en transferencia:** Los campos saldo_origen_antes/despues y saldo_destino_antes/despues en la tabla transferencia permiten reconstruir el estado financiero sin depender de la bitácora NoSQL para auditorías rápidas.
4. **Umbral configurable:** La tabla config_umbral_transferencia permite modificar el umbral de aprobación sin cambiar código ni estructura, solo actualizando un registro.
5. **Bitácora NoSQL separada:** El BC-06 usa MongoDB para aprovechar el esquema flexible del campo datos_detalle (JSON variable por tipo de operación), manteniendo la BD relacional limpia.
6. **Vistas por rol:** Toda la seguridad de visibilidad se implementa en la BD mediante vistas, no en la capa de aplicación.

---

*Documento generado en FASE 1  Modelo de Datos Relacional*
*Siguiente fase: FASE 2 — Generación de DDL SQL (CREATE TABLE, TRIGGERS, STORED PROCEDURES)*
