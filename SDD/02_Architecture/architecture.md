# Arquitectura del Sistema  Gestión Bancaria
## FASE 2: Diseño Arquitectónico

**Estilo:** Domain-Driven Design + Arquitectura en Capas
**Fecha:** 2026-05-03

---

## 1. VISIÓN GENERAL DE CAPAS

```
┌─────────────────────────────────────────────────────┐
│              CAPA DE PRESENTACIÓN                  │
│         (Interfaces de usuario / API REST)          │
├─────────────────────────────────────────────────────┤
              CAPA DE APLICACIÓN                     │
│   (Orquestación de casos de uso — sin lógica BD)    │
├─────────────────────────────────────────────────────┤
│              CAPA DE DOMINIO                        │
  (Bounded Contexts, Agregados, Eventos de Dominio)  │
├───────────────────────────────────────────────
              CAPA DE INFRAESTRUCTURA                │
│   MySQL 8.x (relacional) + MongoDB (bitácora)       
│   Triggers · Stored Procedures · Views · Events     │
────────┘
```

**Principio fundamental:** Toda la lógica de negocio (validaciones, transiciones de estado, impacto financiero, auditoría) reside en la capa de infraestructura (BD). La capa de aplicación solo orquesta llamadas a Stored Procedures.

---

## 2. MAPA DE BOUNDED CONTEXTS Y DEPENDENCIAS

```
                    ┌──────────────────┐
                    │  BC-01           │
                      Identidad y     
                    │  Acceso          │
                    └────────┬─────────┘
                              U/D (provee usuario activo)
              ┌──────────────┴──────────────┐
              ▼                             ▼
   ┌──────────────────┐         ┌──────────────────┐
   │  BC-02           │         │  BC-07           │
   │  Gestión de                 Productos       
   │  Clientes        │         │  Bancarios       │
            ─┬─────────┘
             U/D                          PUB
            ▼                             │
                     
     BC-03           ─────────────────┘
     Cuentas         
   │  Bancarias       │
   
             ACL (valida/actualiza saldo)
     ┌
     ▼             ▼
  
│  BC-04  │  │  BC-05  │
│Préstamos│  │Transfer.│
  
     │  PUB       │ PUB
     ──┘
           ▼
   
     BC-06           │
   │  Auditoría y     
     Bitácora        
   └──────────────────┘
```

| Relación | Patrón | Descripción |
|---|---|---|
| BC-01  todos | Upstream/Downstream | Identidad es prerequisito de todo el sistema |
| BC-02  BC-03 | Upstream/Downstream | Solo clientes registrados abren cuentas |
| BC-03  BC-04 | Anti-Corruption Layer | Préstamos validan y modifican cuentas |
| BC-03  BC-05 | Anti-Corruption Layer | Transferencias validan y modifican cuentas |
| BC-04  BC-06 | Publisher/Subscriber | Eventos de préstamo → bitácora |
| BC-05  BC-06 | Publisher/Subscriber | Eventos de transferencia → bitácora |
| BC-07  BC-06 | Publisher/Subscriber | Cambios de catálogo → bitácora |

---

## 3. FLUJO DE DATOS — PRÉSTAMO

```
Cliente ──► [sp_solicitar_prestamo] ──► INSERT prestamo (estado=En Estudio)
                                              
                                    TRG-06 valida cliente activo
                                    TRG-08 registra EVT-08 en bitácora
                                              │
Analista ──► [sp_aprobar_prestamo]  ──► UPDATE prestamo (estado=Aprobado)
          [sp_rechazar_prestamo] ──► UPDATE prestamo (estado=Rechazado)
                                              │
                                    TRG-07 valida transición + rol
                                    TRG-08 registra EVT-09/10 en bitácora
                                              │
Analista ─ [sp_desembolsar_prestamo]  UPDATE prestamo (estado=Desembolsado)
                                              
                                    SP-02 valida cuenta destino activa
                                    SP-02 UPDATE cuenta_bancaria saldo += monto
                                    TRG-05 registra EVT-07 (saldo) en bitácora
                                    TRG-08 registra EVT-11 (desembolso) en bitácora
```

---

## 4. FLUJO DE DATOS — TRANSFERENCIA

```
Usuario ──► [sp_crear_transferencia]
                
       TRG-09 valida cuentas activas, monto > 0
       TRG-09 consulta config_umbral_transferencia
                │
       
        monto <= umbral │ monto > umbral
                        
  estado=Pendiente   estado=En Espera
       │             de Aprobacion
  TRG-10 llama            
  sp_ejecutar     Supervisor aprueba/rechaza
       │          [sp_aprobar_transferencia]
                 [sp_rechazar_transferencia]
       │                  │
                 TRG-11 valida rol + transición
                         
       │          ┌───────┴──────────┐
                  Aprobada          │ Rechazada
       │          ▼                   ▼
        sp_ejecutar_transferencia  bitácora
                    
          START TRANSACTION
          UPDATE cuenta origen  saldo -= monto
          UPDATE cuenta destino saldo += monto
          UPDATE transferencia  estado=Ejecutada
          COMMIT
                    │
          TRG-12 registra EVT-16 en bitácora

  [EVENT SCHEDULER cada 1 min]
  TRG-13 detecta NOW() > fecha_vencimiento
        UPDATE estado=Vencida
       → TRG-12 registra EVT-17 en bitácora
```

---

## 5. TECNOLOGÍAS Y JUSTIFICACIÓN

| Tecnología | Uso | Justificación |
|---|---|---|
| MySQL 8.x | BD relacional principal | Soporte nativo de transacciones ACID, triggers, stored procedures, events, views y CHECK constraints |
| MongoDB | Bitácora NoSQL | Esquema flexible para el campo datos_detalle (JSON variable por tipo de operación); escritura append-only |
| MySQL Event Scheduler | Vencimiento automático | Ejecuta TRG-13 cada minuto para detectar transferencias expiradas sin depender de la aplicación |
| MySQL Views | Seguridad por rol | Restringe visibilidad de datos según el rol del usuario conectado |
| MySQL Transactions | Atomicidad financiera | Garantiza que débito y crédito ocurran juntos o ninguno (INV-26) |
