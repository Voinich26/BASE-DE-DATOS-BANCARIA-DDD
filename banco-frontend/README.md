# BancoDDD — Frontend Enterprise

Interfaz bancaria enterprise construida con **Next.js 14 + TypeScript**. Se conecta al backend Spring Boot en `http://localhost:8081`.

---

## Stack

| Tecnología | Versión | Uso |
|---|---|---|
| Next.js | 14.x | Framework React (App Router) |
| TypeScript | 5.x | Tipado estático |
| TailwindCSS | 3.x | Estilos |
| Framer Motion | 11.x | Animaciones |
| Axios | 1.x | HTTP + interceptors JWT |
| React Hook Form + Zod | 7.x / 3.x | Formularios y validación |
| Zustand | 4.x | Estado global (auth + UI) |
| TanStack Query | 5.x | Server state y caché |
| Recharts | 2.x | Gráficos financieros |
| Radix UI | — | Componentes accesibles |
| Sonner | 1.x | Notificaciones toast |

---

## Instalación

```bash
npm install
```

---

## Variables de Entorno

El archivo `.env.local` ya está configurado para desarrollo local:

```env
NEXT_PUBLIC_API_URL=http://localhost:8081
NEXT_PUBLIC_APP_NAME=BancoDDD
NEXT_PUBLIC_APP_ENV=development
```

> El backend debe estar corriendo en el puerto 8081.

---

## Comandos

```bash
npm run dev        # Servidor de desarrollo → http://localhost:3000
npm run build      # Build de producción
npm run start      # Servidor de producción
npm run lint       # ESLint
```

---

## Módulos

| Ruta | Descripción | Roles |
|---|---|---|
| `/dashboard` | Dashboard ejecutivo con KPIs y gráficos | Todos |
| `/accounts` | Listado y gestión de cuentas | Todos |
| `/accounts/new` | Abrir nueva cuenta bancaria | Empleados, Admin |
| `/accounts/:num` | Detalle de cuenta con movimientos | Todos |
| `/transfers` | Historial y aprobación de transferencias | Todos |
| `/transfers/new` | Wizard de nueva transferencia (4 pasos) | Clientes, Empleados |
| `/transfers/:id` | Detalle con timeline de estados | Todos |
| `/loans` | Gestión de préstamos | Todos |
| `/batches` | Pagos masivos y nómina empresarial | Empresa, Supervisor |
| `/users` | Directorio de usuarios del sistema | Admin, Supervisor |
| `/audit` | Bitácora de auditoría | Admin, Supervisor, Analista |
| `/analytics` | Analítica avanzada | Admin, Analista |
| `/settings` | Perfil y cambio de contraseña | Todos |

---

## Autenticación

- Access token en `sessionStorage` (o `localStorage` con "recordarme")
- Refresh token en `localStorage`
- Renovación automática al recibir 401
- Cookie de presencia `banco_auth_token` para el middleware Next.js
- Logout automático tras 15 minutos de inactividad

---

## Servicios API

| Servicio | Archivo | Endpoints |
|---|---|---|
| Auth | `auth.service.ts` | login, refresh, logout, me, changePassword |
| Cuentas | `account.service.ts` | getAll, getByNumber, create, deposit, withdraw, block |
| Transferencias | `transfer.service.ts` | getHistory, getPending, create, approve, reject |
| Préstamos | `loan.service.ts` | getAll, solicitar, aprobar, rechazar, desembolsar |
| Lotes | `batch.service.ts` | getAll, crear, procesar, rechazar, getMetrics |
| Usuarios | `user.service.ts` | getAll, create, changeStatus, assignRole |
| Bitácora | `audit.service.ts` | getAll (con filtros por operación/usuario) |

---

## Credenciales de Prueba

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | admin@banco.com | Admin2026! |
| Supervisor | supervisor@banco.com | Banco2026! |
| Analista | analista@banco.com | Banco2026! |
| Ventanilla | pedro.vent@banco.com | Banco2026! |
| Cliente Persona | ana.lopez@email.com | Banco2026! |
| Cliente Empresa | contacto@empresaabc.com | Banco2026! |

---

## Docker

```bash
docker build -t banco-frontend .
docker run -p 3000:3000 banco-frontend
```

---

*BancoDDD Frontend — Next.js 14 + TypeScript*
