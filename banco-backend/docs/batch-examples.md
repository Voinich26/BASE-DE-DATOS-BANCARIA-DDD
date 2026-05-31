# BC-06 — Pagos Masivos y Nómina Empresarial

## Tabla de Endpoints

| Método | Endpoint                        | Rol mínimo requerido          | Descripción                              |
|--------|---------------------------------|-------------------------------|------------------------------------------|
| POST   | `/v1/batches`                   | CLIENTE_EMPRESA               | Crear lote de pagos masivos              |
| GET    | `/v1/batches`                   | Autenticado (ownership)       | Historial paginado con filtros           |
| GET    | `/v1/batches/{id}`              | Autenticado (ownership)       | Detalle completo del lote                |
| GET    | `/v1/batches/{id}/details`      | Autenticado (ownership)       | Ítems paginados del lote                 |
| GET    | `/v1/batches/{id}/timeline`     | Autenticado (ownership)       | Timeline de eventos del lote             |
| GET    | `/v1/batches/dashboard`         | Autenticado (ownership)       | Dashboard empresarial                    |
| GET    | `/v1/batches/metrics`           | ANALISTA_INTERNO              | Métricas operativas globales             |
| POST   | `/v1/batches/{id}/process`      | SUPERVISOR_EMPRESA            | Procesar lote aprobado                   |
| POST   | `/v1/batches/{id}/reject`       | SUPERVISOR_EMPRESA            | Rechazar lote                            |

---

## Flujo Completo

```
EMPRESA crea lote  →  estado: Pendiente
         ↓
SUPERVISOR procesa →  estado: Procesado  (ítems ejecutados individualmente)
         ↓
SUPERVISOR rechaza →  estado: Rechazado  (con motivo registrado)
```

---

## Ejemplos cURL

### 1. Login como empresa

```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "correoElectronico": "empresa@abc.com",
    "password": "Empresa123!"
  }'
```

### 2. Crear lote de nómina

```bash
curl -X POST http://localhost:8080/api/v1/batches \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN_EMPRESA>" \
  -d '{
    "nitEmpresa": "900123456-1",
    "concepto": "Nómina Mayo 2026",
    "idUsuarioCreador": 5,
    "transferencias": [
      {
        "cuentaOrigen": "001-123456789-0",
        "cuentaDestino": "001-111111111-0",
        "monto": 1500000.00,
        "conceptoDetalle": "Salario empleado 001"
      },
      {
        "cuentaOrigen": "001-123456789-0",
        "cuentaDestino": "001-222222222-0",
        "monto": 1800000.00,
        "conceptoDetalle": "Salario empleado 002"
      }
    ]
  }'
```

**Respuesta exitosa (201):**
```json
{
  "success": true,
  "message": "Lote de pagos creado exitosamente",
  "data": {
    "idLote": 12,
    "nitEmpresa": "900123456-1",
    "razonSocialEmpresa": "Empresa ABC S.A.S.",
    "concepto": "Nómina Mayo 2026",
    "estadoLote": "Pendiente",
    "estadoFinal": false,
    "totalItems": 2,
    "montoTotal": 3300000.00,
    "fechaCreacion": "2026-05-24T10:00:00"
  }
}
```

### 3. Consultar historial de lotes

```bash
curl -X GET "http://localhost:8080/api/v1/batches?page=0&size=10&sortDir=desc" \
  -H "Authorization: Bearer <TOKEN_EMPRESA>"
```

### 4. Obtener detalle completo

```bash
curl -X GET http://localhost:8080/api/v1/batches/12 \
  -H "Authorization: Bearer <TOKEN_EMPRESA>"
```

### 5. Ver ítems paginados

```bash
curl -X GET "http://localhost:8080/api/v1/batches/12/details?page=0&size=50" \
  -H "Authorization: Bearer <TOKEN_EMPRESA>"
```

### 6. Ver timeline del lote

```bash
curl -X GET http://localhost:8080/api/v1/batches/12/timeline \
  -H "Authorization: Bearer <TOKEN_EMPRESA>"
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "idLote": 12,
    "concepto": "Nómina Mayo 2026",
    "estadoActual": "Procesado",
    "estadoFinal": true,
    "eventos": [
      {
        "estadoAnterior": null,
        "estadoNuevo": "Pendiente",
        "fechaEvento": "2026-05-24T10:00:00",
        "nombreUsuario": "María López",
        "descripcion": "Lote creado con 2 ítems por un monto de 3300000.00"
      },
      {
        "estadoAnterior": "Pendiente",
        "estadoNuevo": "Procesado",
        "fechaEvento": "2026-05-24T10:05:00",
        "nombreUsuario": "Carlos Supervisor",
        "descripcion": "Lote procesado: 2 exitosos, 0 fallidos"
      }
    ]
  }
}
```

### 7. Procesar lote (Supervisor)

```bash
curl -X POST http://localhost:8080/api/v1/batches/12/process \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN_SUPERVISOR>" \
  -d '{ "idSupervisor": 3 }'
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Lote procesado exitosamente",
  "data": {
    "idLote": 12,
    "estadoLote": "Procesado",
    "estadoFinal": true,
    "totalItems": 2,
    "itemsExitosos": 2,
    "itemsFallidos": 0,
    "montoTotal": 3300000.00,
    "montoProcesado": 3300000.00,
    "porcentajeExito": 100.0
  }
}
```

### 8. Rechazar lote (Supervisor)

```bash
curl -X POST http://localhost:8080/api/v1/batches/12/reject \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN_SUPERVISOR>" \
  -d '{
    "idSupervisor": 3,
    "motivo": "Saldo insuficiente en cuenta empresarial principal"
  }'
```

### 9. Dashboard empresarial

```bash
curl -X GET http://localhost:8080/api/v1/batches/dashboard \
  -H "Authorization: Bearer <TOKEN_EMPRESA>"
```

### 10. Métricas globales (Analista)

```bash
curl -X GET http://localhost:8080/api/v1/batches/metrics \
  -H "Authorization: Bearer <TOKEN_ANALISTA>"
```

---

## Errores Comunes

| Código | Causa                                                        | Solución                                      |
|--------|--------------------------------------------------------------|-----------------------------------------------|
| 400    | Campos obligatorios faltantes o lista vacía                  | Revisar el body del request                   |
| 403    | Empresa intentando ver lotes de otra empresa                 | Usar el NIT de su propia empresa              |
| 404    | Lote o cuenta no encontrada                                  | Verificar IDs y números de cuenta             |
| 409    | Violación de integridad de datos                             | Verificar referencias FK                      |
| 422    | Duplicado detectado, cuenta inactiva, saldo insuficiente     | Revisar estado de cuentas y saldos            |
| 422    | Estado inválido para procesar/rechazar                       | Verificar el estado actual del lote           |

---

## Protecciones Enterprise

| Protección              | Descripción                                                                 |
|-------------------------|-----------------------------------------------------------------------------|
| **Ownership**           | Empresas solo ven y operan sus propios lotes                                |
| **Anti-duplicados**     | No se permite el mismo concepto en las últimas 24 horas                     |
| **Validación de cuentas** | Todas las cuentas origen deben estar activas antes de crear el lote       |
| **Validación de estados** | Solo lotes en Pendiente/Aprobado pueden procesarse                        |
| **Tolerancia a fallos** | Un ítem fallido no cancela el resto del lote                                |
| **Trazabilidad**        | Cada lote registra creador, supervisor, fechas y motivo de rechazo          |
| **MDC Logging**         | Cada operación registra `requestId`, `operacion` y `nitEmpresa` en los logs |
| **RBAC granular**       | Crear: EMPRESA / Procesar-Rechazar: SUPERVISOR / Métricas: ANALISTA         |
| **Idempotencia**        | El SP verifica estado antes de procesar para evitar doble procesamiento     |
