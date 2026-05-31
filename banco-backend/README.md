# Banco DDD — Backend API REST

Backend bancario construido con **Java 21 + Spring Boot 3** sobre MySQL 8 con lógica de negocio completa en stored procedures y triggers. Arquitectura Hexagonal (Ports & Adapters) con DDD.

---

## Stack

| Tecnología | Versión | Uso |
|---|---|---|
| Java | 21 | Lenguaje principal |
| Spring Boot | 3.2.5 | Framework base |
| Spring Security | 6.x | JWT + RBAC |
| JJWT | 0.12.5 | Tokens stateless |
| Spring Data JPA | 3.x | Consultas de lectura |
| JdbcTemplate | 6.x | Stored procedures |
| MySQL Connector/J | 8.3.0 | Driver JDBC |
| Lombok | 1.18.32 | Boilerplate reduction |
| SpringDoc OpenAPI | 2.5.0 | Swagger UI |

---

## Estructura

```
src/main/java/com/banco/ddd/
├── domain/
│   ├── model/          # Entidades JPA (Aggregate Roots)
│   └── exception/      # Excepciones de dominio
├── application/
│   ├── dto/            # Request/Response DTOs
│   ├── port/           # Puertos in/out (interfaces)
│   └── service/        # Casos de uso
├── infrastructure/
│   ├── adapter/in/web/ # Controllers REST
│   ├── adapter/out/    # Repositorios JPA
│   ├── config/         # Security, CORS, JPA
│   └── security/       # JWT filter, service
└── shared/
    └── response/       # ApiResponse<T>, PagedResponse<T>
```

---

## Configuración

```bash
cp .env.example .env
# Editar con tus credenciales de MySQL
```

Variables requeridas:
```env
DB_URL=jdbc:mysql://localhost:3306/banco_ddd?useSSL=false&serverTimezone=America/Bogota&allowPublicKeyRetrieval=true
DB_USERNAME=root
DB_PASSWORD=tu_contraseña
JWT_SECRET=BancoDDD2026SecretKeyMustBe256BitsLongForHS256Algorithm!!
SERVER_PORT=8081
CORS_ORIGINS=http://localhost:3000
```

---

## Ejecutar

```bash
# Desarrollo
mvn spring-boot:run

# O con el script incluido
powershell -File run-backend.ps1
```

El servidor arranca en `http://localhost:8081/api`

---

## Endpoints

Base URL: `http://localhost:8081/api`

| Módulo | Método | Path | Descripción |
|---|---|---|---|
| **Auth** | POST | `/v1/auth/login` | Login → JWT |
| **Auth** | POST | `/v1/auth/refresh` | Renovar token |
| **Auth** | POST | `/v1/auth/logout` | Cerrar sesión |
| **Auth** | GET | `/v1/auth/me` | Perfil autenticado |
| **Auth** | POST | `/v1/auth/change-password` | Cambiar contraseña |
| **Usuarios** | GET | `/v1/usuarios` | Listar usuarios |
| **Usuarios** | POST | `/v1/usuarios` | Crear usuario |
| **Usuarios** | PATCH | `/v1/usuarios/{id}/estado` | Cambiar estado |
| **Clientes** | GET | `/v1/clientes/personas` | Listar personas |
| **Clientes** | POST | `/v1/clientes/personas` | Registrar persona |
| **Clientes** | GET | `/v1/clientes/empresas` | Listar empresas |
| **Clientes** | POST | `/v1/clientes/empresas` | Registrar empresa |
| **Cuentas** | GET | `/v1/accounts` | Listar cuentas |
| **Cuentas** | POST | `/v1/accounts` | Abrir cuenta |
| **Cuentas** | GET | `/v1/accounts/dashboard` | Dashboard financiero |
| **Cuentas** | GET | `/v1/accounts/{num}` | Detalle de cuenta |
| **Cuentas** | POST | `/v1/accounts/deposit` | Depósito |
| **Cuentas** | POST | `/v1/accounts/withdraw` | Retiro |
| **Cuentas** | PATCH | `/v1/accounts/{num}/block` | Bloquear |
| **Cuentas** | PATCH | `/v1/accounts/{num}/cancel` | Cancelar |
| **Cuentas** | PATCH | `/v1/accounts/{num}/reactivate` | Reactivar |
| **Transferencias** | POST | `/v1/transfers` | Crear transferencia |
| **Transferencias** | GET | `/v1/transfers/history` | Historial |
| **Transferencias** | GET | `/v1/transfers/pending` | Pendientes aprobación |
| **Transferencias** | POST | `/v1/transfers/{id}/approve` | Aprobar |
| **Transferencias** | POST | `/v1/transfers/{id}/reject` | Rechazar |
| **Transferencias** | GET | `/v1/transfers/dashboard` | Dashboard |
| **Transferencias** | GET | `/v1/transfers/metrics` | Métricas |
| **Préstamos** | GET | `/v1/prestamos` | Listar préstamos |
| **Préstamos** | POST | `/v1/prestamos` | Solicitar |
| **Préstamos** | POST | `/v1/prestamos/{id}/aprobar` | Aprobar |
| **Préstamos** | POST | `/v1/prestamos/{id}/rechazar` | Rechazar |
| **Préstamos** | POST | `/v1/prestamos/{id}/desembolsar` | Desembolsar |
| **Lotes** | GET | `/v1/batches` | Historial lotes |
| **Lotes** | POST | `/v1/batches` | Crear lote |
| **Lotes** | POST | `/v1/batches/{id}/process` | Procesar |
| **Lotes** | POST | `/v1/batches/{id}/reject` | Rechazar |
| **Lotes** | GET | `/v1/batches/metrics` | Métricas |
| **Bitácora** | GET | `/v1/bitacola` | Listar auditoría |
| **Bitácora** | GET | `/v1/bitacola/usuario/{id}` | Por usuario |
| **Bitácora** | GET | `/v1/bitacola/operacion/{tipo}` | Por operación |

### Swagger UI
```
http://localhost:8081/api/swagger-ui.html
```

---

## Autenticación

```bash
# 1. Login
curl -X POST http://localhost:8081/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"correoElectronico":"admin@banco.com","password":"Admin2026!"}'

# 2. Usar el token
curl http://localhost:8081/api/v1/accounts \
  -H "Authorization: Bearer <access_token>"
```

---

## Roles y Permisos

| Rol (BD) | Rol Spring Security | Permisos principales |
|---|---|---|
| Administrador | `ROLE_ADMINISTRADOR` | Acceso total |
| Supervisor Empresa | `ROLE_SUPERVISOR_EMPRESA` | Aprobar transferencias/lotes, gestionar usuarios |
| Analista Interno | `ROLE_ANALISTA_INTERNO` | Aprobar/rechazar préstamos, bitácora |
| Empleado Ventanilla | `ROLE_EMPLEADO_VENTANILLA` | Depósitos, retiros, abrir cuentas |
| Empleado Comercial | `ROLE_EMPLEADO_COMERCIAL` | Solicitar préstamos, gestionar clientes |
| Cliente Persona Natural | `ROLE_CLIENTE_PERSONA_NATURAL` | Sus cuentas, transferencias, préstamos |
| Cliente Empresa | `ROLE_CLIENTE_EMPRESA` | Cuentas empresa, lotes de pago |

---

## Seguridad

- BCrypt strength=12 para contraseñas
- JWT HMAC-SHA256 — access (24h) + refresh (7 días)
- Refresh token rotation con detección de replay attacks
- Rate limiting: 10 req/min login, 20 req/min refresh
- Brute-force protection: bloqueo tras 5 intentos fallidos
- Headers: HSTS, CSP, X-Frame-Options, X-Content-Type-Options

---

## Colecciones Postman

En `docs/` hay colecciones Postman listas para importar:
- `Banco-DDD-Auth.postman_collection.json`
- `Banco-DDD-Accounts.postman_collection.json`
- `Banco-DDD-Transfers.postman_collection.json`
- `Banco-DDD-Batches.postman_collection.json`

---

*Banco DDD Backend — Spring Boot 3 + Java 21 + MySQL 8*
