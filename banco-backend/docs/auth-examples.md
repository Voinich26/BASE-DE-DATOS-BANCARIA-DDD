# Módulo de Autenticación — Ejemplos de uso

Base URL: `http://localhost:8080/api`

---

## 1. Login

```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "correoElectronico": "admin@banco.com",
    "password": "Banco2026!"
  }'
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Login exitoso",
  "data": {
    "accessToken":  "eyJhbGciOiJIUzI1NiJ9.eyJpZFVzdWFyaW8iOjEsInJvbCI6...",
    "refreshToken": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbkBiYW5jby5...",
    "tokenType":    "Bearer",
    "expiresIn":    86400,
    "idUsuario":    1,
    "nombreCompleto": "Administrador Sistema",
    "correoElectronico": "admin@banco.com",
    "rol": "ADMINISTRADOR"
  },
  "timestamp": "2026-05-24T10:30:00"
}
```

**Cuenta bloqueada (423):**
```json
{
  "success": false,
  "message": "Cuenta temporalmente bloqueada por exceso de intentos fallidos. Intente nuevamente en 30 minutos",
  "timestamp": "2026-05-24T10:30:00"
}
```

---

## 2. Refresh Token

```bash
curl -X POST http://localhost:8080/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbkBiYW5jby5..."
  }'
```

**Respuesta exitosa (200):** igual que login — nuevo par de tokens.

**Token revocado (401):**
```json
{
  "success": false,
  "message": "Refresh token revocado. Inicie sesión nuevamente",
  "timestamp": "2026-05-24T10:30:00"
}
```

---

## 3. Logout

```bash
curl -X POST http://localhost:8080/api/v1/auth/logout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..." \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbkBiYW5jby5..."
  }'
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Sesión cerrada exitosamente",
  "timestamp": "2026-05-24T10:35:00"
}
```

---

## 4. Cambio de contraseña

```bash
curl -X POST http://localhost:8080/api/v1/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..." \
  -d '{
    "passwordActual":      "Banco2026!",
    "passwordNuevo":       "NuevaClave2026#",
    "passwordConfirmacion": "NuevaClave2026#"
  }'
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Contraseña actualizada. Por seguridad, inicie sesión nuevamente",
  "timestamp": "2026-05-24T10:40:00"
}
```

**Contraseña actual incorrecta (401):**
```json
{
  "success": false,
  "message": "La contraseña actual es incorrecta",
  "timestamp": "2026-05-24T10:40:00"
}
```

**No cumple política (422):**
```json
{
  "success": false,
  "message": "La contraseña debe contener al menos un carácter especial",
  "timestamp": "2026-05-24T10:40:00"
}
```

---

## 5. Perfil del usuario autenticado (GET /me)

```bash
curl -X GET http://localhost:8080/api/v1/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "idUsuario": 1,
    "nombreCompleto": "Administrador Sistema",
    "correoElectronico": "admin@banco.com",
    "idIdentificacion": "9999999999",
    "telefono": "+57 300 000 0000",
    "fechaNacimiento": "1985-01-01",
    "direccion": "Sede Principal Banco",
    "rol": "ADMINISTRADOR",
    "estadoUsuario": "Activo",
    "fechaCreacion": "2026-01-01T00:00:00"
  },
  "timestamp": "2026-05-24T10:45:00"
}
```

---

## 6. Flujo completo de autenticación

```
1. POST /v1/auth/login
   → Obtener accessToken + refreshToken

2. Usar accessToken en header: Authorization: Bearer <accessToken>
   → Acceder a endpoints protegidos

3. Cuando accessToken expire (24h):
   POST /v1/auth/refresh  { "refreshToken": "..." }
   → Obtener nuevo par de tokens (rotation)

4. Al cerrar sesión:
   POST /v1/auth/logout  { "refreshToken": "..." }
   + Header: Authorization: Bearer <accessToken>
   → Ambos tokens quedan revocados

5. Si se cambia la contraseña:
   POST /v1/auth/change-password
   → Todos los tokens activos se revocan
   → Volver al paso 1
```

---

## 7. Headers de seguridad esperados en respuestas

```
X-Request-Id: abc123def456    ← Trazabilidad (RequestIdFilter)
Content-Type: application/json
```

---

## 8. Colección Postman (variables de entorno)

```json
{
  "variable": [
    { "key": "baseUrl",      "value": "http://localhost:8080/api" },
    { "key": "accessToken",  "value": "" },
    { "key": "refreshToken", "value": "" }
  ]
}
```

**Script post-login (Tests tab en Postman):**
```javascript
const response = pm.response.json();
if (response.success) {
    pm.environment.set("accessToken",  response.data.accessToken);
    pm.environment.set("refreshToken", response.data.refreshToken);
}
```

**Script post-refresh:**
```javascript
const response = pm.response.json();
if (response.success) {
    pm.environment.set("accessToken",  response.data.accessToken);
    pm.environment.set("refreshToken", response.data.refreshToken);
}
```
