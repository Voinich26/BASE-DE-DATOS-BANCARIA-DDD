# BC-03 Cuentas Bancarias — Ejemplos de uso

Base URL: `http://localhost:8080/api`

> Reemplazar `<TOKEN>` con el access token obtenido en `/v1/auth/login`

---

## Flujo completo: crear → depositar → retirar → bloquear → cancelar

### 1. Crear cuenta

```bash
curl -X POST http://localhost:8080/api/v1/accounts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "numeroCuenta":      "001-123456789-0",
    "nombreTipoCuenta":  "Ahorros",
    "idTitular":         "1234567890",
    "tipoTitular":       "PERSONA_NATURAL",
    "codigoIsoMoneda":   "COP",
    "saldoInicial":      500000.00,
    "idUsuarioApertura": 1
  }'
```

**Respuesta (201):**
```json
{
  "success": true,
  "message": "Cuenta bancaria abierta",
  "data": {
    "numeroCuenta": "001-123456789-0",
    "tipoCuenta": "Ahorros",
    "idTitular": "1234567890",
    "tipoTitular": "PERSONA_NATURAL",
    "saldoActual": 500000.00,
    "moneda": "Peso Colombiano",
    "codigoIsoMoneda": "COP",
    "estadoCuenta": "Activa",
    "fechaApertura": "2026-05-24"
  }
}
```

---

### 2. Consultar cuenta

```bash
curl -X GET http://localhost:8080/api/v1/accounts/001-123456789-0 \
  -H "Authorization: Bearer <TOKEN>"
```

---

### 3. Detalle completo

```bash
curl -X GET http://localhost:8080/api/v1/accounts/001-123456789-0/detail \
  -H "Authorization: Bearer <TOKEN>"
```

---

### 4. Cuentas de un cliente

```bash
curl -X GET "http://localhost:8080/api/v1/accounts/client/1234567890?page=0&size=10" \
  -H "Authorization: Bearer <TOKEN>"
```

---

### 5. Depositar

```bash
curl -X POST http://localhost:8080/api/v1/accounts/deposit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "numeroCuenta": "001-123456789-0",
    "monto":        200000.00,
    "idUsuario":    1,
    "concepto":     "Depósito en efectivo ventanilla"
  }'
```

**Respuesta (200):**
```json
{ "success": true, "message": "Depósito realizado exitosamente" }
```

---

### 6. Retirar

```bash
curl -X POST http://localhost:8080/api/v1/accounts/withdraw \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "numeroCuenta": "001-123456789-0",
    "monto":        50000.00,
    "idUsuario":    1,
    "concepto":     "Retiro en efectivo ventanilla"
  }'
```

**Saldo insuficiente (422):**
```json
{
  "success": false,
  "message": "Saldo insuficiente. Saldo disponible: 650000.00 COP"
}
```

---

### 7. Resumen de movimientos

```bash
curl -X GET http://localhost:8080/api/v1/accounts/001-123456789-0/summary \
  -H "Authorization: Bearer <TOKEN>"
```

**Respuesta (200):**
```json
{
  "success": true,
  "data": {
    "numeroCuenta": "001-123456789-0",
    "saldoActual": 650000.00,
    "totalTransferenciasEnviadas": 3,
    "totalTransferenciasRecibidas": 2,
    "montoTotalEnviado": 300000.00,
    "montoTotalRecibido": 150000.00,
    "ultimasTransferencias": [
      {
        "idTransferencia": 42,
        "cuentaContraparte": "001-987654321-0",
        "direccion": "ENVIADA",
        "monto": 100000.00,
        "estado": "Ejecutada",
        "fecha": "2026-05-24T09:15:00"
      }
    ]
  }
}
```

---

### 8. Dashboard financiero

```bash
curl -X GET http://localhost:8080/api/v1/accounts/dashboard \
  -H "Authorization: Bearer <TOKEN>"
```

---

### 9. Bloquear cuenta

```bash
curl -X PATCH "http://localhost:8080/api/v1/accounts/001-123456789-0/block?idUsuario=1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "motivo": "Actividad sospechosa detectada — revisión de cumplimiento"
  }'
```

---

### 10. Reactivar cuenta

```bash
curl -X PATCH "http://localhost:8080/api/v1/accounts/001-123456789-0/reactivate?idUsuario=1" \
  -H "Authorization: Bearer <TOKEN>"
```

---

### 11. Cancelar cuenta (requiere saldo = 0)

```bash
# Primero retirar todo el saldo
curl -X POST http://localhost:8080/api/v1/accounts/withdraw \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{ "numeroCuenta": "001-123456789-0", "monto": 650000.00, "idUsuario": 1 }'

# Luego cancelar
curl -X PATCH "http://localhost:8080/api/v1/accounts/001-123456789-0/cancel?idUsuario=1" \
  -H "Authorization: Bearer <TOKEN>"
```

---

## Endpoints disponibles

| Método | Endpoint                                    | Descripción                    | Roles mínimos                    |
|--------|---------------------------------------------|--------------------------------|----------------------------------|
| POST   | `/v1/accounts`                              | Apertura de cuenta             | EMPLEADO_VENTANILLA              |
| GET    | `/v1/accounts`                              | Listar todas (paginado)        | ANALISTA_INTERNO                 |
| GET    | `/v1/accounts/dashboard`                    | Dashboard del cliente          | Autenticado                      |
| GET    | `/v1/accounts/{accountNumber}`              | Obtener cuenta                 | Autenticado (ownership)          |
| GET    | `/v1/accounts/{accountNumber}/detail`       | Detalle completo               | Autenticado (ownership)          |
| GET    | `/v1/accounts/client/{clientId}`            | Cuentas de un cliente          | Autenticado (ownership)          |
| GET    | `/v1/accounts/{accountNumber}/summary`      | Resumen de movimientos         | Autenticado (ownership)          |
| POST   | `/v1/accounts/deposit`                      | Depósito de caja               | EMPLEADO_VENTANILLA              |
| POST   | `/v1/accounts/withdraw`                     | Retiro de caja                 | EMPLEADO_VENTANILLA              |
| PATCH  | `/v1/accounts/{accountNumber}/block`        | Bloquear cuenta                | SUPERVISOR_EMPRESA               |
| PATCH  | `/v1/accounts/{accountNumber}/cancel`       | Cancelar cuenta                | ANALISTA_INTERNO                 |
| PATCH  | `/v1/accounts/{accountNumber}/reactivate`   | Reactivar cuenta               | SUPERVISOR_EMPRESA               |

---

## Manejo de errores

| Código | Situación                                    |
|--------|----------------------------------------------|
| 201    | Cuenta creada exitosamente                   |
| 200    | Operación exitosa                            |
| 400    | Datos de entrada inválidos (Bean Validation) |
| 401    | No autenticado                               |
| 403    | Sin permisos (ownership o rol insuficiente)  |
| 404    | Cuenta no encontrada                         |
| 422    | Regla de negocio violada (SP/dominio)        |
| 429    | Rate limit excedido                          |
| 500    | Error interno del servidor                   |
