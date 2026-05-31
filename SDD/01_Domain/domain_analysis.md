# Análisis de Dominio  Sistema de Gestión Bancaria
## FASE 0: Domain-Driven Design (DDD)

**Proyecto:** Sistema Core Transaccional y de Gestión de Información Bancaria  
**Metodología:** Domain-Driven Design (DDD)  
**Documento base:** Banco.md  
**Fecha de análisis:** 2026-05-03  

---

## 1. LENGUAJE UBICUO DEL DOMINIO

El lenguaje ubicuo es el vocabulario compartido entre expertos del negocio y desarrolladores. Todos los términos siguientes deben usarse de forma consistente en código, base de datos, documentación y conversaciones.

| Término | Definición en el dominio |
|---|---|
| Cliente Persona Natural | Usuario individual del banco, mayor de edad, identificado por cédula/DNI |
| Cliente Empresa | Entidad legal registrada con NIT, representada por un Representante Legal |
| Representante Legal | Persona Natural vinculada obligatoriamente a un Cliente Empresa |
| Cuenta Bancaria | Producto financiero que almacena saldo en una moneda, asociado a un titular |
| Saldo | Valor decimal que representa el dinero disponible en una cuenta |
| Préstamo / Crédito | Producto financiero que otorga un monto aprobado a un cliente bajo condiciones de tasa y plazo |
| Transferencia | Operación que mueve fondos de una cuenta origen a una cuenta destino |
| Transferencia de Alto Valor | Transferencia que supera un umbral definido y requiere aprobación de Supervisor |
| Desembolso | Acto de acreditar el monto aprobado de un préstamo a una cuenta destino |
| Estado | Valor de catálogo que describe la situación actual de una entidad (cuenta, préstamo, transferencia, usuario) |
| Flujo de Aprobación | Secuencia de estados y actores que validan una operación antes de ejecutarla |
| Bitácora | Registro inmutable de auditoría de todas las operaciones del sistema (NoSQL) |
| Rol | Conjunto de permisos y restricciones asignado a un usuario del sistema |
| Analista Interno | Empleado del banco con autoridad para aprobar o rechazar préstamos |
| Supervisor de Empresa | Empleado con autoridad para aprobar o rechazar transferencias empresariales |
| Empleado de Ventanilla | Empleado que consulta saldos y abre cuentas, sin poder aprobar préstamos |
| Empleado Comercial | Empleado que gestiona productos y crea solicitudes, sin modificar saldos |
| Empleado de Empresa | Operador que crea transferencias y pagos masivos dentro de su empresa |
| Producto Bancario | Servicio financiero ofrecido por el banco (cuenta, préstamo, etc.) |
| Umbral de Aprobación | Monto límite a partir del cual una transferencia requiere aprobación |
| Vencimiento | Expiración automática de una transferencia pendiente tras 60 minutos |
| Invariante | Regla de negocio que nunca puede violarse bajo ninguna circunstancia |
| Evento de Dominio | Hecho relevante ocurrido en el dominio que debe registrarse y puede disparar acciones |

---

## 2. BOUNDED CONTEXTS

Se identifican los siguientes contextos delimitados, cada uno con responsabilidad exclusiva sobre su modelo:

---

### BC-01: Identidad y Acceso (Identity & Access)

**Responsabilidad:** Gestión de usuarios del sistema, autenticación, roles y permisos.

**Incluye:**
- Registro y mantenimiento de usuarios (personas naturales y empresas)
- Asignación de roles
- Control de estado de usuario (activo/inactivo)
- Validación de identidad (unicidad de identificación)

**Actores principales:** Todos los roles del sistema

---

### BC-02: Gestión de Clientes (Customer Management)

**Responsabilidad:** Ciclo de vida de clientes, tanto personas naturales como empresas.

**Incluye:**
- Alta, modificación y consulta de clientes
- Validación de mayoría de edad
- Vinculación Empresa  Representante Legal
- Delegación de permisos empresariales

**Actores principales:** Empleado Comercial, Empleado de Ventanilla

---

### BC-03: Cuentas Bancarias (Account Management)

**Responsabilidad:** Apertura, mantenimiento y consulta de cuentas bancarias.

**Incluye:**
- Apertura de cuentas
- Consulta de saldo
- Bloqueo/desbloqueo de cuentas
- Validación de estado antes de operar

**Actores principales:** Empleado de Ventanilla, Cliente Persona Natural, Cliente Empresa

---

### BC-04: Préstamos y Créditos (Loan Management)

**Responsabilidad:** Solicitud, evaluación, aprobación y desembolso de préstamos.

**Incluye:**
- Solicitud de préstamo por cliente
- Flujo de aprobación por Analista Interno
- Desembolso a cuenta destino
- Transiciones de estado del préstamo

**Actores principales:** Cliente Persona Natural, Cliente Empresa, Analista Interno

---

### BC-05: Transferencias (Transfer Management)

**Responsabilidad:** Creación, validación, aprobación y ejecución de transferencias.

**Incluye:**
- Transferencias entre cuentas propias y a terceros
- Flujo de aprobación para transferencias de alto valor
- Vencimiento automático a los 60 minutos
- Impacto financiero (débito/crédito en cuentas)

**Actores principales:** Cliente Persona Natural, Empleado de Empresa, Supervisor de Empresa

---

### BC-06: Auditoría y Bitácora (Audit & Logging)

**Responsabilidad:** Registro inmutable de todas las operaciones del sistema para trazabilidad y auditoría.

**Incluye:**
- Registro de cada operación con actor, fecha y datos antes/después
- Consulta de bitácora por Analista Interno
- Registro de vencimientos automáticos

**Actores principales:** Analista Interno (lectura), Sistema (escritura automática)

---

### BC-07: Productos Bancarios (Product Catalog)

**Responsabilidad:** Catálogo de productos y servicios ofrecidos por el banco.

**Incluye:**
- Definición de productos (nombre, categoría, si requiere aprobación)
- Asociación de productos a clientes

**Actores principales:** Empleado Comercial

---

## 3. ENTIDADES, VALUE OBJECTS Y AGREGADOS

---

### BC-01: Identidad y Acceso

#### Entidades

| Entidad | Identidad | Descripción |
|---|---|---|
| Usuario | ID_Usuario | Representa a cualquier actor del sistema con credenciales y rol |

#### Value Objects

| Value Object | Campos | Descripción |
|---|---|---|
| Correo Electrónico | correo | Debe contener "@" y dominio válido |
| Teléfono | numero | 715 dígitos numéricos |
| Rol del Sistema | rol | Catálogo cerrado de roles válidos |
| Estado de Usuario | estado | Activo / Inactivo |

#### Agregado

- **Raíz:** `Usuario`
- **Invariante de agregado:** Un usuario inactivo no puede realizar operaciones sobre ningún producto.

---

### BC-02: Gestión de Clientes

#### Entidades

| Entidad | Identidad | Descripción |
|---|---|---|
| ClientePersonaNatural | ID_Identificacion | Persona física mayor de edad |
| ClienteEmpresa | NIT | Entidad legal con representante legal obligatorio |

#### Value Objects

| Value Object | Campos | Descripción |
|---|---|---|
| Nombre Completo | nombre, apellidos | Inmutable una vez registrado salvo corrección formal |
| Fecha de Nacimiento | fecha | Formato DD/MM/YYYY; valida mayoría de edad |
| Dirección | domicilio | Texto libre obligatorio |
| Identificación | numero, tipo | Único en todo el sistema |
| Razón Social | nombre_legal | Nombre legal de la empresa |

#### Agregados

- **Agregado ClientePersonaNatural:** Raíz `ClientePersonaNatural`
- **Agregado ClienteEmpresa:** Raíz `ClienteEmpresa`, contiene referencia a `ClientePersonaNatural` como Representante Legal
- **Invariante:** El NIT de empresa y la cédula de persona natural son únicos en todo el sistema.
- **Invariante:** Una empresa sin Representante Legal válido no puede ser registrada.

---

### BC-03: Cuentas Bancarias

#### Entidades

| Entidad | Identidad | Descripción |
|---|---|---|
| CuentaBancaria | Numero_Cuenta | Producto financiero con saldo y estado |

#### Value Objects

| Value Object | Campos | Descripción |
|---|---|---|
| Saldo | monto, moneda | Decimal no negativo; moneda de catálogo |
| Tipo de Cuenta | tipo | Catálogo: Ahorros, Corriente, etc. |
| Estado de Cuenta | estado | Activa / Bloqueada / Cerrada |
| Moneda | codigo_iso | Catálogo de monedas aceptadas |
| Fecha de Apertura | fecha | Inmutable tras creación |

#### Agregado

- **Raíz:** `CuentaBancaria`
- **Invariante:** No se puede operar sobre una cuenta bloqueada o cerrada.
- **Invariante:** El saldo nunca puede ser negativo tras una operación.
- **Invariante:** No se puede abrir una cuenta para un usuario inactivo.

---

### BC-04: Préstamos y Créditos

#### Entidades

| Entidad | Identidad | Descripción |
|---|---|---|
| Prestamo | ID_Prestamo | Solicitud de crédito con ciclo de vida completo |

#### Value Objects

| Value Object | Campos | Descripción |
|---|---|---|
| Monto Solicitado | valor, moneda | Decimal mayor a cero |
| Monto Aprobado | valor, moneda | Puede diferir del solicitado; definido por analista |
| Tasa de Interés | porcentaje | Decimal positivo |
| Plazo | meses | Entero positivo |
| Estado de Préstamo | estado | En Estudio / Aprobado / Rechazado / Desembolsado |
| Tipo de Préstamo | tipo | Catálogo: Personal, Hipotecario, Empresarial, etc. |

#### Agregado

- **Raíz:** `Prestamo`
- **Entidades internas:** referencia a `CuentaBancaria` (destino de desembolso)
- **Invariante:** Solo un Analista Interno puede cambiar el estado de Préstamo.
- **Invariante:** La transición de estados es estrictamente: En Estudio  Aprobado/Rechazado  Desembolsado.
- **Invariante:** El monto aprobado debe ser mayor a cero para proceder al desembolso.
- **Invariante:** La cuenta destino de desembolso debe estar activa y pertenecer al cliente solicitante.

---

### BC-05: Transferencias

#### Entidades

| Entidad | Identidad | Descripción |
|---|---|---|
| Transferencia | ID_Transferencia | Movimiento de fondos entre dos cuentas |

#### Value Objects

| Value Object | Campos | Descripción |
|---|---|---|
| Monto de Transferencia | valor | Decimal mayor a cero |
| Estado de Transferencia | estado | Pendiente / En Espera de Aprobación / Aprobada / Rechazada / Ejecutada / Vencida |
| Fecha de Creación | fecha_hora | Timestamp inmutable |
| Fecha de Aprobación | fecha_hora | Timestamp registrado al aprobar/rechazar |
| Referencia de Cuenta | numero_cuenta | Identifica origen y destino |

#### Agregado

- **Raíz:** `Transferencia`
- **Invariante:** El monto debe ser mayor a cero.
- **Invariante:** La cuenta origen debe tener saldo suficiente antes de ejecutar.
- **Invariante:** Ninguna cuenta involucrada puede estar bloqueada.
- **Invariante:** Una transferencia vencida no puede ser aprobada ni ejecutada.
- **Invariante:** El ID de transferencia es único en todo el sistema.
- **Regla de proceso:** Si el monto supera el umbral definido, el estado inicial es "En Espera de Aprobación".
- **Regla de proceso:** Transcurridos 60 minutos sin aprobación, el sistema cambia el estado a "Vencida" automáticamente.

---

### BC-06: Auditoría y Bitácora

#### Entidades

| Entidad | Identidad | Descripción |
|---|---|---|
| RegistroBitacora | ID_Bitacora | Entrada inmutable de auditoría (NoSQL) |

#### Value Objects

| Value Object | Campos | Descripción |
|---|---|---|
| Tipo de Operación | tipo | Transferencia, Préstamo, Apertura de Cuenta, Vencimiento, etc. |
| Datos de Detalle | json | Snapshot del estado antes y después de la operación |
| Referencia de Actor | id_usuario, rol | Quién ejecutó la operación |
| Timestamp | fecha_hora | Momento exacto de la operación |

#### Agregado

- **Raíz:** `RegistroBitacora`
- **Invariante:** Los registros de bitácora son de solo inserción. Nunca se modifican ni eliminan.
- **Invariante:** Toda operación que afecte saldo, estado de préstamo o estado de transferencia DEBE generar un registro en bitácora.

---

### BC-07: Productos Bancarios

#### Entidades

| Entidad | Identidad | Descripción |
|---|---|---|
| ProductoBancario | Codigo_Producto | Definición de un producto o servicio del banco |

#### Value Objects

| Value Object | Campos | Descripción |
|---|---|---|
| Nombre de Producto | nombre | Texto descriptivo |
| Categoría | categoria | Catálogo de categorías de productos |
| Requiere Aprobación | booleano | Indica si el producto necesita flujo de aprobación |

#### Agregado

- **Raíz:** `ProductoBancario`

---

## 4. EVENTOS DE DOMINIO

Los eventos de dominio representan hechos que han ocurrido y son relevantes para el negocio. Deben persistirse en la bitácora y pueden disparar acciones en otros contextos.

| # | Evento | Bounded Context origen | Descripción | Contextos que reaccionan |
|---|---|---|---|---|
| EVT-01 | `UsuarioRegistrado` | BC-01 | Un nuevo usuario fue creado en el sistema | BC-02 |
| EVT-02 | `UsuarioDesactivado` | BC-01 | Un usuario fue marcado como inactivo | BC-03, BC-04, BC-05 |
| EVT-03 | `ClientePersonaNaturalRegistrado` | BC-02 | Se registró un cliente persona natural | BC-06 |
| EVT-04 | `ClienteEmpresaRegistrado` | BC-02 | Se registró un cliente empresa con su representante | BC-06 |
| EVT-05 | `CuentaAbierta` | BC-03 | Se abrió una nueva cuenta bancaria | BC-06 |
| EVT-06 | `CuentaBloqueada` | BC-03 | Una cuenta fue bloqueada | BC-05, BC-06 |
| EVT-07 | `SaldoActualizado` | BC-03 | El saldo de una cuenta fue modificado (débito o crédito) | BC-06 |
| EVT-08 | `PrestamoSolicitado` | BC-04 | Un cliente envió una solicitud de préstamo | BC-06 |
| EVT-09 | `PrestamoAprobado` | BC-04 | Un analista aprobó el préstamo | BC-03, BC-06 |
| EVT-10 | `PrestamoRechazado` | BC-04 | Un analista rechazó el préstamo | BC-06 |
| EVT-11 | `PrestamoDesembolsado` | BC-04 | El monto fue acreditado a la cuenta destino | BC-03, BC-06 |
| EVT-12 | `TransferenciaCreada` | BC-05 | Se registró una nueva transferencia | BC-06 |
| EVT-13 | `TransferenciaEnEsperaDeAprobacion` | BC-05 | La transferencia supera el umbral y espera supervisor | BC-06 |
| EVT-14 | `TransferenciaAprobada` | BC-05 | El supervisor aprobó la transferencia | BC-03, BC-06 |
| EVT-15 | `TransferenciaRechazada` | BC-05 | El supervisor rechazó la transferencia | BC-06 |
| EVT-16 | `TransferenciaEjecutada` | BC-05 | Los fondos fueron movidos efectivamente entre cuentas | BC-03, BC-06 |
| EVT-17 | `TransferenciaVencida` | BC-05 | Pasaron 60 minutos sin aprobación; transferencia expirada | BC-06 |
| EVT-18 | `OperacionRegistradaEnBitacora` | BC-06 | Confirmación de persistencia de auditoría |  |

---

## 5. CONTEXT MAP (MAPA DE CONTEXTOS)

Define las relaciones y dependencias entre los Bounded Contexts.

```

                        CONTEXT MAP                                  
                                                                     
                        
    BC-01               BC-02                            
    Identidad y       U/D      Gestión de                       
    Acceso                     Clientes                         
                        
                                                                   
            U/D                           U/D                      
                                                                   
                        
    BC-03             BC-04                            
    Cuentas           ACL      Préstamos y                      
    Bancarias                  Créditos                         
                        
                                                                    
            ACL                                                     
                                                                    
                        
    BC-05               BC-06                            
    Transferencias    PUB      Auditoría y                      
                               Bitácora                         
           ─             
                                                                    │
                                                
    BC-07           ─                          
    Productos         PUB                                          
    Bancarios                                                      
                                                 


Leyenda:
  U/D  = Upstream / Downstream (el upstream define el contrato)
  ACL  = Anti-Corruption Layer (el consumidor traduce el modelo)
  PUB  = Publisher / Subscriber (eventos de dominio)
   = Relación bidireccional con ACL en ambos lados
```

### Descripción de relaciones

| Relación | Tipo | Descripción |
|---|---|---|
| BC-01  BC-02 | Upstream/Downstream | Identidad provee el usuario; Clientes consume y extiende |
| BC-01  BC-03 | Upstream/Downstream | Solo usuarios activos pueden tener cuentas |
| BC-02  BC-03 | Upstream/Downstream | Solo clientes registrados pueden abrir cuentas |
| BC-02  BC-04 | Upstream/Downstream | Solo clientes registrados pueden solicitar préstamos |
| BC-03  BC-04 | ACL bidireccional | Préstamos necesitan validar cuentas; desembolso actualiza saldo |
| BC-03  BC-05 | ACL bidireccional | Transferencias validan y modifican saldos de cuentas |
| BC-04  BC-06 | Publisher/Subscriber | Cada evento de préstamo genera registro en bitácora |
| BC-05  BC-06 | Publisher/Subscriber | Cada evento de transferencia genera registro en bitácora |
| BC-03  BC-06 | Publisher/Subscriber | Cambios de saldo y estado de cuenta se registran en bitácora |
| BC-07  BC-06 | Publisher/Subscriber | Cambios en catálogo de productos se registran en bitácora |

---

## 6. CLASIFICACIÓN DE REGLAS DE NEGOCIO

### 6.1 Invariantes (Reglas Fuertes  nunca pueden violarse)

Estas reglas deben implementarse como restricciones en la base de datos (constraints, triggers, checks).

#### Dominio: Identidad y Usuarios

| ID | Invariante |
|---|---|
| INV-01 | El número de identificación (cédula/NIT) es único en todo el sistema |
| INV-02 | El correo electrónico debe contener "@" y un dominio válido |
| INV-03 | El teléfono debe tener entre 7 y 15 dígitos |
| INV-04 | Un usuario inactivo no puede ejecutar ninguna operación transaccional |
| INV-05 | El rol de un usuario es un valor de catálogo cerrado |

#### Dominio: Clientes

| ID | Invariante |
|---|---|
| INV-06 | Un Cliente Persona Natural debe ser mayor de edad (fecha de nacimiento válida) |
| INV-07 | Un Cliente Empresa debe tener obligatoriamente un Representante Legal (Persona Natural registrada) |
| INV-08 | El NIT de empresa es único en todo el sistema |

#### Dominio: Cuentas Bancarias

| ID | Invariante |
|---|---|
| INV-09 | El saldo de una cuenta nunca puede ser negativo |
| INV-10 | No se puede operar (débito/crédito) sobre una cuenta bloqueada o cerrada |
| INV-11 | No se puede abrir una cuenta para un usuario inactivo |
| INV-12 | El número de cuenta es único en todo el sistema |
| INV-13 | La moneda de una cuenta es inmutable tras su apertura |

#### Dominio: Préstamos

| ID | Invariante |
|---|---|
| INV-14 | Solo un Analista Interno puede aprobar o rechazar un préstamo |
| INV-15 | La transición de estados de préstamo es estrictamente: En Estudio  Aprobado/Rechazado  Desembolsado |
| INV-16 | No se puede desembolsar un préstamo rechazado |
| INV-17 | El monto aprobado para desembolso debe ser mayor a cero |
| INV-18 | La cuenta destino de desembolso debe estar activa y pertenecer al cliente solicitante |
| INV-19 | El cliente solicitante debe estar activo y registrado |

#### Dominio: Transferencias

| ID | Invariante |
|---|---|
| INV-20 | El monto de transferencia debe ser mayor a cero |
| INV-21 | La cuenta origen debe tener saldo suficiente para cubrir el monto antes de ejecutar |
| INV-22 | Ninguna cuenta involucrada (origen o destino) puede estar bloqueada |
| INV-23 | Una transferencia vencida no puede ser aprobada ni ejecutada |
| INV-24 | El ID de transferencia es único en todo el sistema |
| INV-25 | Solo un Supervisor de Empresa puede aprobar o rechazar transferencias de alto valor |
| INV-26 | El impacto financiero (débito en origen, crédito en destino) debe ser atómico |

#### Dominio: Bitácora

| ID | Invariante |
|---|---|
| INV-27 | Los registros de bitácora son inmutables: no se modifican ni eliminan |
| INV-28 | Toda operación que afecte saldo, estado de préstamo o estado de transferencia debe generar un registro en bitácora |
| INV-29 | El ID de bitácora es único en todo el sistema |

---

### 6.2 Reglas de Proceso (Flujos y Condiciones)

Estas reglas gobiernan el comportamiento dinámico del sistema y deben implementarse como lógica en stored procedures, triggers o funciones de base de datos.

#### Flujo de Préstamos

| ID | Regla de Proceso |
|---|---|
| RP-01 | Al crear una solicitud de préstamo, el estado inicial es "En Estudio" |
| RP-02 | El Analista Interno revisa la solicitud y puede cambiar el estado a "Aprobado" o "Rechazado" |
| RP-03 | Al aprobar, se registra la fecha de aprobación y el monto aprobado |
| RP-04 | Al desembolsar, se valida la cuenta destino, se incrementa el saldo y se registra en bitácora |
| RP-05 | El estado pasa a "Desembolsado" solo tras confirmar el crédito exitoso en la cuenta |
| RP-06 | Cada cambio de estado del préstamo genera un evento registrado en bitácora con estado anterior y nuevo |

#### Flujo de Transferencias

| ID | Regla de Proceso |
|---|---|
| RP-07 | Al crear una transferencia, si el monto no supera el umbral, el estado es "Pendiente" y se ejecuta directamente |
| RP-08 | Si el monto supera el umbral definido, el estado inicial es "En Espera de Aprobación" |
| RP-09 | El Supervisor de Empresa puede aprobar o rechazar la transferencia en espera |
| RP-10 | Al aprobar, se valida saldo, se ejecuta el movimiento y el estado pasa a "Ejecutada" |
| RP-11 | Al rechazar, el estado pasa a "Rechazada" y se registra en bitácora |
| RP-12 | Si transcurren 60 minutos desde la creación sin aprobación, el sistema cambia el estado a "Vencida" automáticamente |
| RP-13 | El vencimiento automático debe registrarse en bitácora con motivo "Tiempo de aprobación expirado" |
| RP-14 | La ejecución de la transferencia es atómica: débito en origen y crédito en destino ocurren en la misma transacción |

#### Restricciones por Rol

| ID | Regla de Proceso |
|---|---|
| RP-15 | Un Cliente Persona Natural solo puede ver sus propias cuentas, préstamos y transferencias |
| RP-16 | Un Cliente Empresa puede ver cuentas y préstamos de su empresa, y delegar permisos |
| RP-17 | El Empleado de Ventanilla puede consultar saldos y abrir cuentas, pero no aprobar préstamos ni ver información de riesgo |
| RP-18 | El Empleado Comercial puede gestionar productos y crear solicitudes, pero no modificar saldos |
| RP-19 | El Empleado de Empresa solo opera dentro del contexto de su empresa; las transferencias grandes requieren aprobación |
| RP-20 | El Supervisor de Empresa aprueba o rechaza transferencias y gestiona usuarios operativos de su empresa |
| RP-21 | El Analista Interno tiene acceso completo a préstamos y bitácora, pero no puede modificar saldos arbitrariamente |

#### Auditoría

| ID | Regla de Proceso |
|---|---|
| RP-22 | Todo registro de bitácora debe incluir: tipo de operación, fecha/hora, ID y rol del actor, ID del producto afectado, y snapshot JSON con datos antes/después |
| RP-23 | Las transferencias en bitácora deben incluir saldos antes y después en origen y destino |
| RP-24 | Los préstamos en bitácora deben incluir el estado anterior y el nuevo estado |
| RP-25 | Los vencimientos en bitácora deben incluir el motivo del vencimiento |

---

## 7. RESUMEN EJECUTIVO DEL DOMINIO

| Elemento DDD | Cantidad identificada |
|---|---|
| Bounded Contexts | 7 |
| Entidades | 8 |
| Value Objects | 28 |
| Agregados | 7 |
| Eventos de Dominio | 18 |
| Invariantes | 29 |
| Reglas de Proceso | 25 |

### Contextos críticos (Core Domain)
- **BC-04 Préstamos** y **BC-05 Transferencias** son el núcleo del negocio bancario. Requieren el mayor rigor en validaciones, flujos de aprobación y auditoría.

### Contextos de soporte (Supporting Domain)
- **BC-03 Cuentas Bancarias** soporta a los contextos críticos como proveedor de estado financiero.
- **BC-06 Auditoría** es transversal y obligatorio para todos los contextos.

### Contextos genéricos (Generic Domain)
- **BC-01 Identidad y Acceso** y **BC-07 Productos Bancarios** son genéricos y pueden evolucionar independientemente.

---

*Documento generado en FASE 0  DDD Domain Analysis*  
*Siguiente fase: FASE 1  Diseño del modelo relacional (SQL)*