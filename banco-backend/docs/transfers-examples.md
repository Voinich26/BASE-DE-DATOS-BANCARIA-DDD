# BC-05 Transferencias — Ejemplos de uso

Base URL: `http://localhost:8080/api`  
Reemplazar `<TOKEN>` con el access token de `/v1/auth/login`

---

## Flujo completo: crear → pendiente → aprobar → ejecutar

### 1. Crear transferencia (monto bajo → auto-ejecuta)

```bash
curl -X POST http://localhost:8080/api/v1/transfers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "cuentaOrigen":     "001-123456789-0",
    "cuentaDestino":    "001-987654321-0",
    "monto":            100000.00,
    "idUsuarioCreador": 1
  }'
```

**Respuesta (201) — ejecutada automáticamente:**
```json
{
  "success": true,
  "message": "Transferencia creada",
  "data": {
    "idTransferencia": 42,
    "estadoTransferencia": "Ejecutada",
    "requiereAprobacion": false,
    "saldoOrigenAntes": 2000000.00,
    "saldoOrigenDespues": 1900000.00,
    "estadoFinal": true,
    "vencida": false
  }
}
```

---

### 2. Crear transferencia (monto alto → espera aprobación)

```bash
curl -X POST http://localhost:8080/api/v1/transfers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "cuentaOrigen":     "001-123456789-0",
    "cuentaDestino":    "001-987654321-0",
    "monto":            9999999.00,
    "idUsuarioCreador": 1
  }'
```

**Respuesta (201) — en espera:**
```json
{
  "data": {
    "idTransferencia": 43,
    "estadoTransferencia": "En Espera de Aprobacion",
    "requiereAprobacion": true,
    "fechaVencimiento": "2026-05-24T11:30:00"
  }
}
```

---

### 3. Consultar transferencias pendientes de aprobación

```bash
curl -X GET "http://localhost:8080/api/v1/transfers/pending?page=0&size=20" \
  -H "Authorization: Bearer <TOKEN_SUPERVISOR>"
```

---

### 4. Aprobar transferencia

```bash
curl -X POST "http://localhost:8080/api/v1/transfers/43/approve?idSupervisor=5" \
  -H "Authorization: Bearer <TOKEN_SUPERVISOR>"
```

**Respuesta (200):**
```json
{
  "success": true,
  "message": "Transferencia aprobada y ejecutada",
  "data": { "estadoTransferencia": "Ejecutada" }
}
```

---

### 5. Rechazar transferencia

```bash
curl -X POST http://localhost:8080/api/v1/transfers/43/reject \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN_SUPERVISOR>" \
  -d '{
    "idSupervisor": 5,
    "motivo": "Monto supera el límite autorizado para este perfil de cliente"
  }'
```

---

### 6. Historial con filtros

```bash
# Todas las transferencias ejecutadas
curl -X GET "http://localhost:8080/api/v1/transfers/history?estado=Ejecutada&page=0&size=10" \
  -H "Authorization: Bearer <TOKEN>"

# Por cuenta origen
curl -X GET "http://localhost:8080/api/v1/transfers/history?cuentaOrigen=001-123456789-0" \
  -H "Authorization: Bearer <TOKEN>"
```

---

### 7. Transferencias de una cuenta

```bash
curl -X GET "http://localhost:8080/api/v1/transfers/account/001-123456789-0?page=0&size=10" \
  -H "Authorization: Bearer <TOKEN>"
```

---

### 8. Timeline de una transferencia

```bash
curl -X GET http://localhost:8080/api/v1/transfers/42/timeline \
  -H "Authorization: Bearer <TOKEN>"
```

**Respuesta:**
```json
{
  "data": {
    "estadoActual": "Ejecutada",
    "estadoFinal": true,
    "transiciones": [
      { "estadoAnterior": "INICIO",    "estadoNuevo": "Pendiente",  "nombreUsuario": "Sistema" },
      { "estadoAnterior": "Pendiente", "estadoNuevo": "Ejecutada",  "nombreUsuario": "Sistema" }
    ]
  }
}
```

---

### 9. Dashboard transaccional

```bash
curl -X GET http://localhost:8080/api/v1/transfers/dashboard \
  -H "Authorization: Bearer <TOKEN>"
```

---

### 10. Métricas operativas (admin)

```bash
curl -X GET http://localhost:8080/api/v1/transfers/metrics \
  -H "Authorization: Bearer <TOKEN_ADMIN>"
```

---

## Endpoints disponibles

| Método | Endpoint                              | Descripción                        | Roles mínimos          |
|--------|---------------------------------------|------------------------------------|------------------------|
| POST   | `/v1/transfers`                       | Crear transferencia                | Autenticado (ownership)|
| GET    | `/v1/transfers/{id}`                  | Detalle de transferencia           | Autenticado (ownership)|
| GET    | `/v1/transfers/history`               | Historial con filtros              | Autenticado (ownership)|
| GET    | `/v1/transfers/account/{accountNumber}`| Por cuenta                        | Autenticado (ownership)|
| GET    | `/v1/transfers/pending`               | Pendientes de aprobación           | SUPERVISOR_EMPRESA     |
| POST   | `/v1/transfers/{id}/approve`          | Aprobar transferencia              | SUPERVISOR_EMPRESA     |
| POST   | `/v1/transfers/{id}/reject`           | Rechazar transferencia             | SUPERVISOR_EMPRESA     |
| GET    | `/v1/transfers/dashboard`             | Dashboard transaccional            | Autenticado            |
| GET    | `/v1/transfers/{id}/timeline`         | Timeline de estados                | Autenticado (ownership)|
| GET    | `/v1/transfers/metrics`               | Métricas operativas                | ANALISTA_INTERNO       |

---

## Protecciones implementadas

| Protección              | Mecanismo                                                      |
|-------------------------|----------------------------------------------------------------|
| Ownership               | Clientes solo ven/operan sus propias cuentas                   |
| Duplicados              | Ventana de 60 seg: misma cuenta/monto/usuario                  |
| Saldo insuficiente      | Validación soft antes del SP (mensaje claro)                   |
| Cuenta inactiva         | Validación de estado antes del INSERT                          |
| Origen = Destino        | Validación explícita en el servicio                            |
| Transferencia vencida   | Validación antes de aprobar/rechazar                           |
| Estado inválido         | Solo se aprueba/rechaza en `En Espera de Aprobacion`           |
| Replay de aprobación    | El SP valida el estado en la BD                                |
