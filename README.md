# 🏦 BancoDDD — Sistema Bancario Enterprise

Plataforma bancaria completa construida con **arquitectura DDD + Hexagonal**, diseñada como proyecto académico de Bases de Datos II. Implementa un core transaccional real con autenticación JWT, RBAC granular, stored procedures, triggers y una interfaz enterprise moderna.

---

## 📐 Arquitectura General

```
┌─────────────────────────────────────────────────────────────────┐
│                        BANCO DDD                                │
│                                                                 │
│   ┌──────────────────┐          ┌──────────────────────────┐   │
│   │  banco-frontend  │  HTTP    │    banco-backend         │   │
│   │  Next.js 14      │◄────────►│    Spring Boot 3 + JWT   │   │
│   │  TypeScript      │  :8081   │    Java 21               │   │
│   │  Puerto: 3000    │          │    Puerto: 8081           │   │
│   └──────────────────┘          └──────────┬───────────────┘   │
│                                            │ JDBC              │
│                                 ┌──────────▼───────────────┐   │
│                                 │    MySQL 8 (banco_ddd)   │   │
│                                 │    SPs · Triggers · Views │   │
│                                 │    Puerto: 3306           │   │
│                                 └──────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🗂️ Estructura del Repositorio

```
BASE DE DATOS BANCARIA DDD/
├── banco-backend/          # API REST Spring Boot (Java 21)
├── banco-frontend/         # SPA Next.js 14 (TypeScript)
├── Banco_Based/            # Scripts SQL completos de la BD
│   ├── 00_run_all.sql      # Ejecutar todo en orden
│   ├── 01_schema.sql       # Creación de la BD
│   ├── 02_catalogs.sql     # Catálogos
│   ├── 03_tables.sql       # Tablas principales
│   ├── 03b_tables_lote.sql # Tablas de pagos masivos
│   ├── 04_constraints.sql  # Restricciones e índices
│   ├── 05_triggers.sql     # Triggers de negocio
│   ├── 05a_sp_bitacora.sql # SP de auditoría
│   ├── 06_procedures.sql   # Stored procedures principales
│   ├── 06b_crud.sql        # SPs CRUD auxiliares
│   ├── 07_seed_data.sql    # Datos iniciales y de prueba
│   ├── 08_tests.sql        # Queries de prueba
│   ├── 09_validation_queries.sql
│   └── V1_credencial_y_admin.sql  # Tabla de credenciales JWT
├── SDD/                    # Documentación de diseño del sistema
├── fix-all.sql             # Script de corrección maestro (ejecutar post-setup)
├── start.bat               # Arrancar todo el sistema
├── stop.bat                # Detener todos los servicios
├── status.bat              # Ver estado de los servicios
└── db-connect.bat          # Conectar a MySQL desde consola
```

---

## ⚡ Inicio Rápido

### Prerrequisitos

| Herramienta | Versión mínima |
|---|---|
| Java (JDK) | 21 |
| Maven | 3.9+ |
| Node.js | 20+ |
| MySQL | 8.0+ |

### 1. Configurar la Base de Datos

Abre MySQL Workbench y ejecuta en orden:

```sql
-- Paso 1: Crear esquema completo
SOURCE Banco_Based/00_run_all.sql;

-- Paso 2: Aplicar correcciones y usuarios de prueba
SOURCE fix-all.sql;
```

### 2. Configurar el Backend

```bash
cd banco-backend
copy .env.example .env
# Editar .env con tu contraseña de MySQL
```

Contenido mínimo del `.env`:
```env
DB_URL=jdbc:mysql://localhost:3306/banco_ddd?useSSL=false&serverTimezone=America/Bogota&allowPublicKeyRetrieval=true
DB_USERNAME=root
DB_PASSWORD=tu_contraseña_aqui
JWT_SECRET=BancoDDD2026SecretKeyMustBe256BitsLongForHS256Algorithm!!
SERVER_PORT=8081
CORS_ORIGINS=http://localhost:3000
```

### 3. Configurar el Frontend

```bash
cd banco-frontend
# El archivo .env.local ya está configurado para desarrollo local
# NEXT_PUBLIC_API_URL=http://localhost:8081
npm install
```

### 4. Arrancar el Sistema

**Opción A — Script automático (recomendado):**
```
Doble clic en start.bat
```

**Opción B — Manual:**
```bash
# Terminal 1 — Backend
cd banco-backend
mvn spring-boot:run

# Terminal 2 — Frontend
cd banco-frontend
npm run dev
```

### 5. Acceder

| Servicio | URL |
|---|---|
| **Frontend** | http://localhost:3000 |
| **Backend API** | http://localhost:8081/api/v1 |
| **Swagger UI** | http://localhost:8081/api/swagger-ui.html |
| **Health Check** | http://localhost:8081/api/actuator/health |

---

## 🔑 Credenciales de Prueba

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | admin@banco.com | Admin2026! |
| Supervisor Empresa | supervisor@banco.com | Banco2026! |
| Analista Interno | analista@banco.com | Banco2026! |
| Empleado Ventanilla | pedro.vent@banco.com | Banco2026! |
| Cliente Persona | ana.lopez@email.com | Banco2026! |
| Cliente Empresa | contacto@empresaabc.com | Banco2026! |

---

## 🏗️ Bounded Contexts (DDD)

| BC | Nombre | Descripción |
|---|---|---|
| BC-01 | Identidad y Acceso | Usuarios, roles, autenticación JWT |
| BC-02 | Gestión de Clientes | Personas naturales y empresas |
| BC-03 | Cuentas Bancarias | Apertura, depósitos, retiros, bloqueos |
| BC-04 | Préstamos y Créditos | Solicitud, aprobación, desembolso |
| BC-05 | Transferencias | Creación, aprobación, vencimiento |
| BC-06 | Pagos Masivos | Lotes de nómina empresarial |
| BC-07 | Bitácora de Auditoría | Trazabilidad completa de operaciones |

---

## 🔐 Seguridad

- **Autenticación:** JWT con access token (24h) + refresh token (7 días)
- **Contraseñas:** BCrypt strength=12
- **RBAC:** `@PreAuthorize` granular por endpoint y método
- **CORS:** Configurado para `localhost:3000`
- **Rate limiting:** 10 req/min en login, 20 req/min en refresh
- **Brute-force protection:** Bloqueo tras 5 intentos fallidos
- **Headers de seguridad:** HSTS, CSP, X-Frame-Options, X-Content-Type-Options

---

## 📡 API REST — Endpoints Principales

| Módulo | Base Path | Descripción |
|---|---|---|
| Auth | `POST /api/v1/auth/login` | Login JWT |
| Auth | `POST /api/v1/auth/refresh` | Renovar token |
| Auth | `GET /api/v1/auth/me` | Perfil del usuario |
| Usuarios | `GET /api/v1/usuarios` | Listar usuarios |
| Clientes | `GET /api/v1/clientes/personas` | Clientes persona natural |
| Clientes | `GET /api/v1/clientes/empresas` | Clientes empresa |
| Cuentas | `GET /api/v1/accounts` | Listar cuentas |
| Cuentas | `POST /api/v1/accounts` | Abrir cuenta |
| Cuentas | `POST /api/v1/accounts/deposit` | Depósito |
| Cuentas | `POST /api/v1/accounts/withdraw` | Retiro |
| Transferencias | `POST /api/v1/transfers` | Crear transferencia |
| Transferencias | `POST /api/v1/transfers/{id}/approve` | Aprobar |
| Préstamos | `POST /api/v1/prestamos` | Solicitar préstamo |
| Préstamos | `POST /api/v1/prestamos/{id}/aprobar` | Aprobar |
| Lotes | `POST /api/v1/batches` | Crear lote de pagos |
| Bitácora | `GET /api/v1/bitacola` | Consultar auditoría |

---

## 🗄️ Base de Datos

La lógica de negocio crítica reside en la BD:

- **~15 Stored Procedures:** `sp_crear_cuenta`, `sp_depositar`, `sp_retirar`, `sp_aprobar_transferencia`, `sp_solicitar_prestamo`, `sp_aprobar_prestamo`, `sp_procesar_lote_transferencia`, etc.
- **~10 Triggers:** Validaciones de negocio, auditoría automática, vencimiento de transferencias
- **Máquinas de estado:** Transferencias (6 estados) y Préstamos (6 estados) con transiciones controladas
- **Bitácora:** Tabla `bitacora_cola` con datos JSON para auditoría completa

---

## 🧪 Testing

```bash
# Backend — compilar y verificar
cd banco-backend && mvn compile

# Frontend — verificar tipos
cd banco-frontend && npx tsc --noEmit

# Frontend — unit tests
cd banco-frontend && npm run test:unit
```

---

## 📚 Documentación Adicional

| Archivo | Contenido |
|---|---|
| `banco-backend/README.md` | Arquitectura hexagonal, stack, endpoints |
| `banco-frontend/README.md` | Componentes, hooks, servicios, testing |
| `banco-backend/docs/` | Colecciones Postman por módulo |
| `SDD/` | Documentos de diseño del sistema |
| `Banco.md` | Enunciado original del proyecto |

---

## 👥 Proyecto Académico

**Materia:** Bases de Datos II  
**Institución:** Universidad  
**Año:** 2026  

---

*BancoDDD — Arquitectura DDD + Hexagonal sobre MySQL 8 con Spring Boot 3 y Next.js 14*
