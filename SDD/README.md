# SDD — Software Design Document
## Sistema de Gestión Bancaria — Core Transaccional

**Metodología:** Domain-Driven Design (DDD)
**Motor relacional:** MySQL 8.x
**Motor NoSQL:** MongoDB / bitácora relacional (cola JSON)
**Fecha última actualización:** 2026-05-23

---

## Estructura del documento

| Carpeta | Contenido | Fase |
|---|---|---|
| 01_Domain/ | Análisis de dominio DDD: lenguaje ubicuo, bounded contexts, agregados, eventos | FASE 0 |
| 02_Architecture/ | Arquitectura del sistema: capas, contextos, flujos de datos | FASE 2 |
| 03_Data_Model/ | Modelo relacional completo: tablas, columnas, FK, índices | FASE 1 |
| 04_Business_Rules/ | Reglas de negocio: invariantes, constraints, flujos de aprobación | FASE 2 |
| 05_Procedures/ | Stored Procedures: definición, parámetros, lógica, manejo de errores | FASE 2 |
| 06_Triggers/ | Triggers: evento, tabla, propósito, pseudocódigo | FASE 2 |
| 07_Security/ | Seguridad: roles, vistas, permisos, restricciones de acceso | FASE 2 |

---

## Principios de diseño

1. **Todo el comportamiento vive en la BD.** Ninguna regla de negocio se delega a la capa de aplicación.
2. **Bounded Contexts aislados.** Las FK entre contextos usan solo identificadores naturales.
3. **Máquinas de estado en datos.** Las transiciones válidas se almacenan en tablas, no en código.
4. **Auditoría total.** Toda operación crítica genera un registro inmutable en bitácora NoSQL.
5. **Seguridad en BD.** La visibilidad por rol se implementa con vistas y permisos de MySQL.

---

## Bounded Contexts

| BC | Nombre | Tipo | Tablas principales |
|---|---|---|---|
| BC-01 | Identidad y Acceso | Generic Domain | usuario, cat_rol, cat_estado_usuario |
| BC-02 | Gestión de Clientes | Supporting Domain | cliente_persona_natural, cliente_empresa |
| BC-03 | Cuentas Bancarias | Supporting Domain | cuenta_bancaria, cat_tipo_cuenta, cat_moneda |
| BC-04 | Préstamos y Créditos | Core Domain | prestamo, cat_estado_prestamo, prestamo_transicion_estado |
| BC-05 | Transferencias y Pagos Masivos | Core Domain | transferencia, lote_transferencia, detalle_lote_transferencia, config_umbral |
| BC-06 | Auditoría y Bitácora | Supporting Domain | bitacora_cola (NoSQL simulado) |
| BC-07 | Productos Bancarios | Generic Domain | producto_bancario, cat_categoria_producto |

---

## Orden de ejecución de scripts SQL

```
01_schema.sql        → Crea BD, usuarios MySQL, configura charset y Event Scheduler
02_catalogs.sql      → Tablas catálogo (Value Objects enumerados)
03_tables.sql        → Tablas principales (Aggregate Roots)
03b_tables_lote.sql  → Tablas de pagos masivos/nómina (lote_transferencia, detalle_lote_transferencia)
04_constraints.sql   → Vistas de seguridad por rol (incluyendo v_bitacora_cliente_pn y v_bitacora_empresa)
05a_sp_bitacora.sql  → sp_registrar_bitacora (debe existir ANTES que los triggers)
05_triggers.sql      → Triggers de validación y auditoría (TRG-01 al TRG-19)
06_procedures.sql    → Stored Procedures core (servicios de dominio)
06b_crud.sql         → CRUD operativo de dominio (SPs de gestión y operaciones de caja)
07_seed_data.sql     → Datos iniciales, catálogos, datos de prueba y permisos
08_tests.sql         → Suite de pruebas automatizadas (48 tests)
```

> **IMPORTANTE:** `05a_sp_bitacora.sql` debe ejecutarse antes de `05_triggers.sql` porque los triggers TRG-05, TRG-08, TRG-10, TRG-12 y TRG-15 al TRG-19 llaman a `sp_registrar_bitacora`. Si los triggers se crean antes que el SP, MySQL los acepta pero fallan en tiempo de ejecución.

> **IMPORTANTE:** `03b_tables_lote.sql` debe ejecutarse antes de `06b_crud.sql` porque `sp_crear_lote_transferencia` y `sp_procesar_lote_transferencia` referencian las tablas `lote_transferencia` y `detalle_lote_transferencia`.

---

## Catálogos y equivalencias importantes

### cat_estado_usuario
| Valor | Descripción |
|---|---|
| Activo | Usuario operativo normal |
| Inactivo | Usuario deshabilitado temporalmente |
| Bloqueado | Usuario bloqueado por seguridad (PDF pág. 11) |

### cat_tipo_cuenta
| Valor | Descripción |
|---|---|
| Ahorros | Cuenta de ahorros estándar |
| Corriente | Cuenta corriente empresarial/personal |
| Personal | Cuenta personal (PDF pág. 5) |
| Empresarial | Cuenta para empresas |

> **Nota:** `Nómina` no es un tipo de cuenta según el PDF; es un caso de uso de pagos masivos implementado en `lote_transferencia`.

### Equivalencia 'Cancelada' vs 'Cerrada'
El PDF (pág. 11) menciona el estado `'Cancelada'` para cuentas. En este sistema se usa `'Cerrada'` como equivalente funcional. El trigger TRG-09 valida `!= 'Activa'`, cubriendo ambos términos. `sp_cancelar_cuenta` implementa el flujo de cierre/cancelación.

---

## Stored Procedures — Descripción completa

### 06_procedures.sql (servicios de dominio core)

| Procedure | BC | Descripción | Roles permitidos |
|---|---|---|---|
| sp_registrar_bitacora | BC-06 | Inserta registro en bitácora NoSQL (cola) | SISTEMA |
| sp_ejecutar_transferencia | BC-05 | Ejecuta transferencia bajo umbral | Empleado Empresa |
| sp_ejecutar_transferencia_interna | BC-05 | Versión interna sin transacción (usada por triggers) | SISTEMA |
| sp_aprobar_transferencia | BC-05 | Aprueba transferencia de alto monto | Supervisor Empresa |
| sp_rechazar_transferencia | BC-05 | Rechaza transferencia de alto monto | Supervisor Empresa |
| sp_bloquear_cuenta | BC-03 | Bloquea una cuenta bancaria | Analista Interno |
| sp_aprobar_prestamo | BC-04 | Aprueba solicitud de préstamo | Analista Interno |
| sp_rechazar_prestamo | BC-04 | Rechaza solicitud de préstamo | Analista Interno |
| sp_desembolsar_prestamo | BC-04 | Desembolsa préstamo aprobado a cuenta destino | Analista Interno |

### 06b_crud.sql (CRUD operativo de dominio)

#### BC-01: Usuarios
| Procedure | Descripción | Roles permitidos |
|---|---|---|
| sp_crear_usuario | Registra nuevo usuario con rol y estado Activo | SISTEMA/Admin |
| sp_cambiar_estado_usuario | Cambia estado: Activo / Inactivo / Bloqueado | SISTEMA/Admin |
| sp_asignar_rol | Cambia el rol de un usuario existente | SISTEMA/Admin |

#### BC-02: Clientes
| Procedure | Descripción | Roles permitidos |
|---|---|---|
| sp_crear_cliente_persona | Registra cliente persona natural vinculado a usuario | Empleado Comercial / SISTEMA |
| sp_actualizar_cliente_persona | Actualiza datos de contacto de cliente PN | Empleado Comercial / SISTEMA |
| sp_crear_cliente_empresa | Registra empresa con representante legal obligatorio | Empleado Comercial / SISTEMA |
| sp_actualizar_cliente_empresa | Actualiza datos corporativos de empresa | Empleado Comercial / SISTEMA |
| sp_bloquear_cliente | Bloquea el usuario asociado a un cliente | SISTEMA/Admin |

#### BC-03: Cuentas y Operaciones de Caja
| Procedure | Descripción | Roles permitidos |
|---|---|---|
| sp_crear_cuenta | Apertura de cuenta bancaria | Empleado Ventanilla |
| sp_cancelar_cuenta | Cierra cuenta (requiere saldo = 0) | Empleado Ventanilla / Admin |
| sp_reactivar_cuenta | Desbloquea cuenta Bloqueada | Analista Interno / Admin |
| sp_depositar | Depósito de caja — aumenta saldo | Empleado Ventanilla |
| sp_retirar | Retiro de caja — disminuye saldo | Empleado Ventanilla |
| sp_consultar_saldo | Consulta saldo y estado de cuenta | Todos los roles |

#### BC-04: Préstamos
| Procedure | Descripción | Roles permitidos |
|---|---|---|
| sp_solicitar_prestamo | Crea solicitud de préstamo en estado 'En Estudio' | Cliente PN, Cliente Empresa, Empleado Comercial |

#### BC-05: Consultas y Pagos Masivos
| Procedure | Descripción | Roles permitidos |
|---|---|---|
| sp_historial_transferencias | Historial de transferencias de una cuenta | Todos los roles |
| sp_historial_prestamos | Historial de préstamos de un cliente | Todos los roles |
| sp_crear_lote_transferencia | Crea lote de pagos masivos (nómina) | Empleado Empresa, Supervisor Empresa |
| sp_procesar_lote_transferencia | Ejecuta todas las líneas del lote atómicamente | Supervisor Empresa |

---

## Triggers — Descripción completa

| ID | Tabla | Evento | Propósito | Invariante |
|---|---|---|---|---|
| TRG-01 | usuario | BEFORE INSERT | Valida correo y teléfono | INV-02, INV-03 |
| TRG-01b | usuario | BEFORE UPDATE | Valida correo y teléfono en actualización | INV-02, INV-03 |
| TRG-02 | cliente_persona_natural | BEFORE INSERT | Valida mayoría de edad (≥18 años) | INV-06 |
| TRG-03 | cuenta_bancaria | BEFORE INSERT | Valida usuario activo al abrir cuenta | INV-11 |
| TRG-04 | cuenta_bancaria | BEFORE UPDATE | Protege moneda inmutable y saldo no negativo | INV-09, INV-13 |
| TRG-05 | cuenta_bancaria | AFTER UPDATE | Registra cambios de saldo/estado en bitácora | INV-28, EVT-07 |
| TRG-06 | prestamo | BEFORE INSERT | Valida cliente activo y fuerza estado 'En Estudio' | INV-19, RP-01 |
| TRG-07 | prestamo | BEFORE UPDATE | Valida transición de estado y rol autorizado | INV-14, INV-15 |
| TRG-08 | prestamo | AFTER UPDATE | Registra cambio de estado de préstamo en bitácora | INV-28, RP-06 |
| TRG-09 | transferencia | BEFORE INSERT | Valida cuentas activas, monto > 0, asigna estado según umbral | INV-20, INV-22, RP-07, RP-08 |
| TRG-10 | transferencia | AFTER INSERT | Ejecuta transferencia directa si no requiere aprobación | RP-07 |
| TRG-11 | transferencia | BEFORE UPDATE | Valida transición de estado y rol en transferencia | INV-23, INV-25 |
| TRG-12 | transferencia | AFTER UPDATE | Registra cambio de estado; ejecuta fondos si Aprobada | INV-28, RP-13 |
| TRG-13 | EVENT SCHEDULER | Cada 1 min | Marca como Vencidas las transferencias expiradas (>60 min) | RP-12 |
| TRG-14 | config_umbral_transferencia | BEFORE INSERT | Garantiza un solo umbral vigente | RP-08 |
| TRG-15 | usuario | AFTER INSERT | Registra creación de usuario en bitácora | EVT-01 |
| TRG-16 | cliente_persona_natural | AFTER INSERT | Registra creación de cliente PN en bitácora | EVT-03 |
| TRG-17 | cliente_empresa | AFTER INSERT | Registra creación de empresa en bitácora | EVT-04 |
| TRG-18 | cuenta_bancaria | AFTER INSERT | Registra apertura de cuenta en bitácora | EVT-05 |
| TRG-19 | prestamo | AFTER INSERT | Registra solicitud de préstamo en bitácora | EVT-08 |

---

## Vistas de seguridad por rol

| Vista | Rol | Descripción |
|---|---|---|
| v_cuentas_cliente_pn | Cliente Persona Natural | Solo sus cuentas bancarias |
| v_prestamos_cliente_pn | Cliente Persona Natural | Solo sus préstamos |
| v_transferencias_cliente_pn | Cliente Persona Natural | Solo sus transferencias |
| v_bitacora_cliente_pn | Cliente Persona Natural | Bitácora filtrada por sus productos (PDF pág. 12) |
| v_cuentas_empresa | Cliente Empresa | Cuentas de su empresa |
| v_prestamos_empresa | Cliente Empresa | Préstamos de su empresa |
| v_bitacora_empresa | Cliente Empresa | Bitácora filtrada por productos de su empresa (PDF pág. 12) |
| v_cuentas_ventanilla | Empleado Ventanilla | Todas las cuentas (sin datos de riesgo) |
| v_transferencias_empresa_op | Empleado Empresa | Transferencias de su empresa |
| v_transferencias_supervisor | Supervisor Empresa | Transferencias pendientes de aprobación |
| v_prestamos_analista | Analista Interno | Todos los préstamos |
| v_bitacora_analista | Analista Interno | Bitácora completa |

---

## Flujos de dominio

### Flujo de Préstamo
```
[Cliente PN / Cliente Empresa / Empleado Comercial]
    → sp_solicitar_prestamo()
        → TRG-06: fuerza estado 'En Estudio', valida usuario activo
        → TRG-19: registra PRESTAMO_SOLICITADO en bitácora
[Analista Interno]
    → sp_aprobar_prestamo() | sp_rechazar_prestamo()
        → TRG-07: valida transición y rol
        → TRG-08: registra cambio de estado en bitácora
    → sp_desembolsar_prestamo()
        → Valida cuenta destino activa
        → Aumenta saldo de cuenta destino
        → TRG-05: registra cambio de saldo en bitácora
        → TRG-08: registra DESEMBOLSADO en bitácora
```

### Flujo de Transferencia
```
[Empleado Empresa / Cliente PN]
    → INSERT INTO transferencia
        → TRG-09: valida cuentas, monto, asigna estado según umbral
        → TRG-10: si no requiere aprobación → sp_ejecutar_transferencia_interna()
                  si requiere aprobación → estado 'En Espera de Aprobacion'
[Supervisor Empresa] (solo si requiere aprobación)
    → sp_aprobar_transferencia()
        → TRG-11: valida transición y rol
        → TRG-12: registra en bitácora → sp_ejecutar_transferencia_interna()
[Event Scheduler — cada 1 minuto]
    → evt_vencimiento_transferencias
        → Marca como 'Vencida' si NOW() > fecha_vencimiento
        → TRG-12: registra VENCIDA en bitácora
```

### Flujo de Pago Masivo / Nómina
```
[Empleado Empresa]
    → sp_crear_lote_transferencia(descripcion, cuenta_origen, detalle_json)
        → Valida rol, cuenta origen activa, detalle no vacío
        → Inserta lote_transferencia (estado: Pendiente)
        → Inserta N filas en detalle_lote_transferencia
        → Registra LOTE_CREADO en bitácora
[Supervisor Empresa]
    → sp_procesar_lote_transferencia(id_lote, id_supervisor)
        → Valida rol y estado del lote
        → Marca lote como 'Procesando'
        → Por cada línea: valida saldo, ejecuta movimiento, crea transferencia individual
        → Líneas exitosas → estado 'Ejecutada'; líneas fallidas → estado 'Fallida'
        → Lote final: 'Completado' (0 errores) o 'Con Errores' (algún fallo)
        → Registra LOTE_PROCESADO en bitácora
```

---

## Dependencias entre scripts

```
01_schema.sql
    └── 02_catalogs.sql
            └── 03_tables.sql
                    ├── 03b_tables_lote.sql   (depende de cuenta_bancaria y transferencia)
                    └── 04_constraints.sql    (depende de todas las tablas principales)
                            └── 05a_sp_bitacora.sql
                                    └── 05_triggers.sql   (depende de sp_registrar_bitacora)
                                            └── 06_procedures.sql
                                                    └── 06b_crud.sql  (depende de 06_procedures.sql y 03b_tables_lote.sql)
                                                            └── 07_seed_data.sql
                                                                    └── 08_tests.sql
```

---

## Resumen de artefactos

| Artefacto | Cantidad |
|---|---|
| Tablas relacionales | 21 (19 originales + lote_transferencia + detalle_lote_transferencia) |
| Tablas catálogo | 11 (incluyendo cat_estado_lote) |
| Colecciones NoSQL (simuladas) | 1 (bitacora_cola) |
| Triggers | 19 (TRG-01 al TRG-19, incluyendo TRG-01b y TRG-14) |
| MySQL Events | 1 (evt_vencimiento_transferencias) |
| Stored Procedures core | 9 (06_procedures.sql) |
| Stored Procedures CRUD | 18 (06b_crud.sql) |
| **Total Stored Procedures** | **27** |
| Vistas de seguridad | 12 (incluyendo v_bitacora_cliente_pn y v_bitacora_empresa) |
| Invariantes cubiertas | 29/29 |
| Reglas de proceso | 25/25 |
| Casos de prueba (08_tests.sql) | 48 tests |

---

## Casos de prueba (08_tests.sql)

| Bloque | Tests | Qué valida |
|---|---|---|
| Bloque 1: Usuarios y Clientes | TEST-01 al TEST-06 | Creación de usuarios, roles, clientes PN, mayoría de edad, bloqueo, apertura con usuario bloqueado |
| Bloque 2: Cuentas Bancarias | TEST-07 al TEST-16 | Apertura, catálogos (Personal, Bloqueado), saldo negativo, moneda inmutable, depósito, retiro, cancelación, operaciones en cuenta cerrada |
| Bloque 3: Transferencias | TEST-17 al TEST-23 | Transferencia válida bajo umbral, sobre umbral, sin saldo, cuenta bloqueada, aprobación, saldos actualizados, transferencia vencida |
| Bloque 4: Préstamos | TEST-24 al TEST-31 | Solicitud por rol permitido, rol no autorizado, aprobación, desembolso, rechazo, transición inválida, desembolso sin cuenta |
| Bloque 5: Pagos Masivos | TEST-32 al TEST-37 | Crear lote, líneas de detalle, procesar lote, lote completado, lote con errores, rol no autorizado |
| Bloque 6: Triggers y Bitácora | TEST-38 al TEST-44 | Correo inválido, teléfono corto, bitácora de usuario/cuenta/préstamo, vistas de bitácora por cliente |
| Bloque 7: Restricciones de Rol | TEST-45 al TEST-48 | Depósito/retiro por rol incorrecto, aprobación de préstamo por rol incorrecto, aprobación de transferencia por rol incorrecto |
