# Reglas de Negocio  Sistema de Gestión Bancaria
## FASE 2: Clasificación y Especificación Completa

**Principio:** Toda regla de negocio vive en la base de datos. La aplicación no valida, solo invoca.
**Fecha:** 2026-05-03

---

## 1. CONSTRAINTS DE COLUMNA (CHECK / NOT NULL / UNIQUE)

Implementados directamente en el DDL de cada tabla.

| ID | Tabla | Columna | Constraint | Invariante |
|---|---|---|---|---|
| C-01 | usuario | id_identificacion | UNIQUE | INV-01 |
| C-02 | usuario | correo_electronico | CHECK (correo_electronico LIKE '%@%.%') | INV-02 |
| C-03 | usuario | telefono | CHECK (CHAR_LENGTH(telefono) BETWEEN 7 AND 15) | INV-03 |
| C-04 | usuario | id_rol | FK NOT NULL → cat_rol | INV-05 |
| C-05 | cliente_persona_natural | fecha_nacimiento | CHECK (TIMESTAMPDIFF(YEAR,fecha_nacimiento,CURDATE())>=18) | INV-06 |
| C-06 | cliente_empresa | id_representante_legal | FK NOT NULL  cliente_persona_natural | INV-07 |
| C-07 | cliente_empresa | nit | PK UNIQUE | INV-08 |
| C-08 | cuenta_bancaria | saldo_actual | CHECK (saldo_actual >= 0) | INV-09 |
| C-09 | cuenta_bancaria | numero_cuenta | PK UNIQUE | INV-12 |
| C-10 | prestamo | monto_solicitado | CHECK (monto_solicitado > 0) | INV-17 |
| C-11 | prestamo | monto_aprobado | CHECK (monto_aprobado IS NULL OR monto_aprobado > 0) | INV-17 |
| C-12 | prestamo | tasa_interes | CHECK (tasa_interes IS NULL OR tasa_interes > 0) | — |
| C-13 | prestamo | plazo_meses | CHECK (plazo_meses IS NULL OR plazo_meses > 0) |  |
| C-14 | transferencia | monto | CHECK (monto > 0) | INV-20 |
| C-15 | transferencia | cuenta_origen/destino | CHECK (cuenta_origen <> cuenta_destino) | — |
| C-16 | config_umbral_transferencia | monto_umbral | CHECK (monto_umbral > 0) |  |

---

## 2. MÁQUINAS DE ESTADO

### 2.1 Estados del Préstamo

```
  [INICIO]
     │
     
 ┌──────────┐    Analista aprueba    ┌──────────┐
 │En Estudio│ ─────────────────────► │ Aprobado │
 └──────────┘                        └────┬─────┘
     │                                    │ Analista desembolsa
      Analista rechaza                   
     ▼                             ┌────────────┐
 ┌──────────┐                      │Desembolsado│ [FINAL]
 │Rechazado │ [FINAL]               └────────────┘
 └──────────┘
```

| Transición | Actor requerido | Acción en BD |
|---|---|---|
| En Estudio → Aprobado | Analista Interno | sp_aprobar_prestamo: registra monto, tasa, plazo, fecha_aprobacion |
| En Estudio  Rechazado | Analista Interno | sp_rechazar_prestamo: registra fecha_aprobacion |
| Aprobado → Desembolsado | Analista Interno | sp_desembolsar_prestamo: acredita saldo, registra fecha_desembolso |

### 2.2 Estados de la Transferencia

```
  [INICIO]
     │
     ▼
   monto<=umbral   ┌──────────┐
 │ Pendiente│ ───────────────► │ Ejecutada [FINAL]
                   
     │ monto>umbral
     
 ┌──────────────────┐  Supervisor aprueba  
 En Espera Aprob.  │ ───────────────────► │ Aprobada 
                       
     │                                           Sistema ejecuta
     │ Supervisor rechaza                       ▼
                                         
 ───┐                             │ Ejecutada│ [FINAL]
 Rechazada  [FINAL]                     └──────────┘
 └──────────┘
     
      60 min sin aprobación
 ┌──────────┐
  Vencida   [FINAL]
 └──────────┘
```

| Transición | Actor | Condición | Acción en BD |
|---|---|---|---|
| Pendiente → Ejecutada | Sistema (TRG-10) | monto <= umbral | sp_ejecutar_transferencia |
| Pendiente → En Espera | Sistema (TRG-09) | monto > umbral | Asigna estado automáticamente |
| En Espera  Aprobada | Supervisor Empresa | — | sp_aprobar_transferencia |
| En Espera → Rechazada | Supervisor Empresa |  | sp_rechazar_transferencia |
| En Espera → Vencida | Sistema (TRG-13/Event) | NOW() > fecha_vencimiento | UPDATE automático |
| Aprobada → Ejecutada | Sistema (TRG-12) | — | sp_ejecutar_transferencia |

---

## 3. REGLAS DE NEGOCIO POR DOMINIO

### 3.1 Dominio: Identidad y Acceso (BC-01)

| ID | Regla | Tipo | Mecanismo |
|---|---|---|---|
| RN-01 | El número de identificación es único en todo el sistema | Invariante | UNIQUE constraint |
| RN-02 | El correo debe contener @ y dominio válido | Invariante | CHECK constraint + TRG-01 |
| RN-03 | El teléfono debe tener entre 7 y 15 dígitos | Invariante | CHECK constraint |
| RN-04 | Un usuario inactivo no puede ejecutar operaciones transaccionales | Invariante | TRG-03, TRG-06, TRG-09 |
| RN-05 | El rol es un valor de catálogo cerrado | Invariante | FK  cat_rol |

### 3.2 Dominio: Gestión de Clientes (BC-02)

| ID | Regla | Tipo | Mecanismo |
|---|---|---|---|
| RN-06 | El cliente persona natural debe ser mayor de edad | Invariante | CHECK TIMESTAMPDIFF + TRG-02 |
| RN-07 | Una empresa debe tener representante legal registrado | Invariante | FK NOT NULL |
| RN-08 | El NIT de empresa es único en todo el sistema | Invariante | PK(nit) |

### 3.3 Dominio: Cuentas Bancarias (BC-03)

| ID | Regla | Tipo | Mecanismo |
|---|---|---|---|
| RN-09 | El saldo nunca puede ser negativo | Invariante | CHECK (saldo_actual >= 0) + TRG-04 |
| RN-10 | No se puede operar sobre cuenta bloqueada o cerrada | Invariante | TRG-09, SP-01, SP-02 |
| RN-11 | No se puede abrir cuenta para usuario inactivo | Invariante | TRG-03 |
| RN-12 | El número de cuenta es único | Invariante | PK(numero_cuenta) |
| RN-13 | La moneda de una cuenta es inmutable tras apertura | Invariante | TRG-04 rechaza UPDATE en id_moneda |

### 3.4 Dominio: Préstamos y Créditos (BC-04)

| ID | Regla | Tipo | Mecanismo |
|---|---|---|---|
| RN-14 | Solo Analista Interno aprueba o rechaza préstamos | Invariante | TRG-07 + prestamo_transicion_estado |
| RN-15 | Transición de estados es estricta: En EstudioAprobado/RechazadoDesembolsado | Invariante | TRG-07 + tabla de transiciones |
| RN-16 | No se puede desembolsar un préstamo rechazado | Invariante | Cubierto por RN-15 |
| RN-17 | El monto aprobado debe ser mayor a cero | Invariante | CHECK constraint |
| RN-18 | La cuenta destino de desembolso debe estar activa y pertenecer al cliente | Invariante | SP-02 valida antes de acreditar |
| RN-19 | El cliente solicitante debe estar activo | Invariante | TRG-06 |
| RN-20 | Al solicitar, el estado inicial es 'En Estudio' | Regla de proceso | TRG-06 asigna estado |
| RN-21 | Al aprobar se registra fecha_aprobacion y datos del crédito | Regla de proceso | SP-05 |
| RN-22 | El desembolso acredita el saldo y registra en bitácora | Regla de proceso | SP-02 + TRG-08 |

### 3.5 Dominio: Transferencias (BC-05)

| ID | Regla | Tipo | Mecanismo |
|---|---|---|---|
| RN-23 | El monto de transferencia debe ser mayor a cero | Invariante | CHECK (monto > 0) |
| RN-24 | La cuenta origen debe tener saldo suficiente | Invariante | SP-01 valida antes de debitar |
| RN-25 | Ninguna cuenta involucrada puede estar bloqueada | Invariante | TRG-09 |
| RN-26 | Una transferencia vencida no puede aprobarse ni ejecutarse | Invariante | TRG-11 |
| RN-27 | El ID de transferencia es único | Invariante | PK AUTO_INCREMENT |
| RN-28 | Solo Supervisor de Empresa aprueba transferencias de alto valor | Invariante | TRG-11 + tabla de transiciones |
| RN-29 | El impacto financiero es atómico (débito + crédito juntos) | Invariante | SP-01 con transacción ACID |
| RN-30 | Si monto > umbral, estado inicial es 'En Espera de Aprobacion' | Regla de proceso | TRG-09 |
| RN-31 | Si monto <= umbral, se ejecuta directamente | Regla de proceso | TRG-10 llama SP-01 |
| RN-32 | Vencimiento automático a los 60 minutos | Regla de proceso | Event Scheduler + TRG-13 |
| RN-33 | El vencimiento se registra en bitácora con motivo | Regla de proceso | TRG-12 llama SP-03 |

### 3.6 Dominio: Auditoría (BC-06)

| ID | Regla | Tipo | Mecanismo |
|---|---|---|---|
| RN-34 | Los registros de bitácora son inmutables | Invariante | Permisos solo INSERT en colección MongoDB |
| RN-35 | Toda operación crítica genera registro en bitácora | Invariante | TRG-05, TRG-08, TRG-12 llaman SP-03 |
| RN-36 | El registro incluye snapshot antes/después | Regla de proceso | SP-03 recibe JSON con datos_detalle |
