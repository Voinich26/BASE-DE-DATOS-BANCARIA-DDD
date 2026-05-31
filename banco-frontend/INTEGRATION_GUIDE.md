# Integration Guide - BancoDDD Enterprise Full Stack

## Overview

This guide provides complete instructions for integrating the BancoDDD frontend with the Spring Boot backend, including authentication, API connections, demo mode, and deployment.

## Architecture

```
┌─────────────────┐
│   Nginx Proxy   │
│   (Port 80/443) │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼────────┐
│ Frontend│ │  Backend   │
│ Next.js │ │ Spring Boot│
│ :3000   │ │   :8080    │
└───┬───┘ └──┬────────┘
    │         │
    └────┬────┘
         │
    ┌────▼────┐
    │  MySQL  │
    │  :3306  │
    └─────────┘
```

## Prerequisites

### Required Software

- **Docker** 20.10+
- **Docker Compose** 2.0+
- **Node.js** 20+
- **npm** 10+
- **Git** 2.30+

### Required Access

- Backend API access
- Database credentials
- Domain management (for production)

## Environment Configuration

### Environment Variables

The application uses different environment files for each stage:

#### Development (.env.development)

```env
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_ENABLE_MOCK_MODE=true
NEXT_PUBLIC_ENABLE_DEMO_MODE=true
NEXT_PUBLIC_MOCK_DELAY=500
```

#### Staging (.env.staging)

```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://staging-api.bancoddd.com/api/v1
NEXT_PUBLIC_APP_ENV=staging
NEXT_PUBLIC_ENABLE_MOCK_MODE=false
NEXT_PUBLIC_ENABLE_DEMO_MODE=false
```

#### Production (.env.production)

```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.bancoddd.com/api/v1
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_ENABLE_MOCK_MODE=false
NEXT_PUBLIC_ENABLE_DEMO_MODE=false
```

## Authentication Integration

### JWT Token Management

The application uses JWT tokens for authentication with automatic refresh:

```typescript
// Token storage
import { getAccessToken, setTokens, clearTokens } from "@/lib/auth/jwt";

// Get access token
const token = getAccessToken();

// Set tokens after login
setTokens({
  accessToken: response.accessToken,
  refreshToken: response.refreshToken,
  expiresIn: response.expiresIn,
}, rememberMe);

// Clear tokens on logout
clearTokens();
```

### Authentication Flow

1. **Login**: User submits credentials to `/v1/auth/login`
2. **Token Storage**: JWT tokens stored securely in localStorage/sessionStorage
3. **Request Interceptor**: Access token automatically added to all API requests
4. **Token Refresh**: Automatic refresh when token expires
5. **Logout**: Tokens cleared and user redirected to login

### Refresh Token Rotation

The application implements automatic token rotation:

```typescript
// Response interceptor in api.ts
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Attempt token refresh
      const refreshToken = getRefreshToken();
      const response = await axios.post('/v1/auth/refresh', { refreshToken });
      
      // Store new tokens
      setTokens(response.data.accessToken, response.data.refreshToken);
      
      // Retry original request
      return api(originalRequest);
    }
    return Promise.reject(error);
  }
);
```

## API Services Integration

### Service Layer Pattern

All API calls are organized into service modules:

```typescript
// src/services/account.service.ts
import { apiGet, apiPost, apiPatch } from "./api";

export const accountService = {
  async getDashboard(): Promise<DashboardFinancieroResponse> {
    const res = await apiGet<DashboardFinancieroResponse>("/v1/accounts/dashboard");
    return res.data;
  },

  async getAll(page = 0, size = 20): Promise<PagedResponse<CuentaBancariaResponse>> {
    const res = await apiGet<PagedResponse<CuentaBancariaResponse>>(
      `/v1/accounts?page=${page}&size=${size}`
    );
    return res.data;
  },
};
```

### Available Services

- **account.service.ts** - Account operations
- **transfer.service.ts** - Transfer operations
- **loan.service.ts** - Loan operations
- **batch.service.ts** - Batch payment operations
- **audit.service.ts** - Audit log operations
- **user.service.ts** - User management operations
- **auth.service.ts** - Authentication operations

### API Endpoints

#### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/auth/login` | User login |
| POST | `/v1/auth/refresh` | Refresh access token |
| POST | `/v1/auth/logout` | User logout |
| GET | `/v1/auth/me` | Get current user |

#### Accounts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/accounts/dashboard` | Get dashboard data |
| GET | `/v1/accounts` | List accounts (paginated) |
| GET | `/v1/accounts/{number}` | Get account by number |
| POST | `/v1/accounts` | Create new account |
| POST | `/v1/accounts/deposit` | Deposit to account |
| POST | `/v1/accounts/withdraw` | Withdraw from account |
| PATCH | `/v1/accounts/{number}/block` | Block account |
| PATCH | `/v1/accounts/{number}/reactivate` | Reactivate account |
| PATCH | `/v1/accounts/{number}/cancel` | Cancel account |

#### Transfers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/transfers/dashboard` | Get transfer dashboard |
| GET | `/v1/transfers/history` | Get transfer history |
| GET | `/v1/transfers/pending` | Get pending transfers |
| POST | `/v1/transfers` | Create new transfer |
| POST | `/v1/transfers/{id}/approve` | Approve transfer |
| POST | `/v1/transfers/{id}/reject` | Reject transfer |

#### Loans

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/prestamos` | List loans (paginated) |
| GET | `/prestamos/{id}` | Get loan by ID |
| POST | `/prestamos` | Create loan application |
| POST | `/prestamos/{id}/aprobar` | Approve loan |
| POST | `/prestamos/{id}/rechazar` | Reject loan |
| POST | `/prestamos/{id}/desembolsar` | Disburse loan |

#### Batch Payments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/batches` | List batches (paginated) |
| GET | `/v1/batches/{id}` | Get batch by ID |
| GET | `/v1/batches/metrics` | Get batch metrics |
| POST | `/v1/batches` | Create new batch |
| POST | `/v1/batches/{id}/approve` | Approve batch |
| POST | `/v1/batches/{id}/reject` | Reject batch |
| POST | `/v1/batches/{id}/process` | Process batch |

#### Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/users` | List users (paginated) |
| GET | `/v1/users/{id}` | Get user by ID |
| POST | `/v1/users` | Create new user |
| PATCH | `/v1/users/{id}` | Update user |
| DELETE | `/v1/users/{id}` | Delete user |
| POST | `/v1/users/{id}/activate` | Activate user |
| POST | `/v1/users/{id}/deactivate` | Deactivate user |

#### Audit

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/audit` | Get audit logs (paginated) |

## Demo Mode Integration

### Mock Data Generator

The application includes a comprehensive mock data generator for demo mode:

```typescript
import { mockAccounts, mockTransfers, mockLoans, mockBatches } from "@/lib/mock/mockData";

// Use mock data when backend is not available
const accounts = mockAccounts;
const transfers = mockTransfers;
```

### Demo Mode Configuration

Demo mode is enabled via environment variable:

```env
NEXT_PUBLIC_ENABLE_DEMO_MODE=true
NEXT_PUBLIC_MOCK_DELAY=500
```

### Mock Data Includes

- **Users**: 4 demo users with different roles
- **Accounts**: 5 demo accounts with different states
- **Transfers**: 4 demo transfers with different statuses
- **Loans**: 3 demo loans with different statuses
- **Batches**: 2 demo batches with different statuses

### Switching Between Modes

```typescript
// Check if demo mode is enabled
const isDemoMode = process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE === "true";

// Use mock data in demo mode
const data = isDemoMode ? mockData : await fetchDataFromAPI();
```

## Error Handling

### Enterprise Error Handling

The application implements comprehensive error handling:

```typescript
// API interceptors handle different error types
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // 401 Unauthorized - Token refresh
    if (error.response?.status === 401) {
      // Auto refresh token
    }
    
    // 403 Forbidden - Permission denied
    if (error.response?.status === 403) {
      toast.error("No tiene permisos para realizar esta acción");
    }
    
    // 404 Not Found
    if (error.response?.status === 404) {
      toast.error("Recurso no encontrado");
    }
    
    // 500 Server Error
    if (error.response?.status >= 500) {
      toast.error("Error del servidor. Por favor intente nuevamente más tarde");
    }
    
    // Network Error
    if (!error.response && error.request) {
      toast.error("Error de conexión. Verifique su red");
    }
    
    return Promise.reject(error);
  }
);
```

### Toast Notifications

The application uses Sonner for toast notifications:

```typescript
import { toast } from "sonner";

// Success
toast.success("Operación completada exitosamente");

// Error
toast.error("Error al procesar la solicitud");

// Info
toast.info("Procesando solicitud...");

// Warning
toast.warning("Advertencia: Acción irreversible");
```

## RBAC Integration

### Role-Based Access Control

The application implements RBAC with 8 user roles:

```typescript
export type UserRole =
  | "ADMINISTRADOR"
  | "SUPERVISOR_EMPRESA"
  | "ANALISTA_INTERNO"
  | "EMPLEADO_VENTANILLA"
  | "EMPLEADO_COMERCIAL"
  | "CLIENTE_EMPRESA"
  | "CLIENTE_PERSONA"
  | "CLIENTE_PERSONA_NATURAL";
```

### Role Checks

```typescript
import { useAuthStore } from "@/store/auth.store";

const { hasRole, isAdmin, isSupervisor, isEmployee, isClient } = useAuthStore();

// Check specific role
if (hasRole("ADMINISTRADOR")) {
  // Show admin features
}

// Check role categories
if (isAdmin()) {
  // Admin only
}

if (isSupervisor()) {
  // Supervisor and above
}

if (isEmployee()) {
  // All employee roles
}

if (isClient()) {
  // All client roles
}
```

### Route Protection

Protected routes use middleware for authentication:

```typescript
// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("access_token");
  const path = request.nextUrl.pathname;

  // Public routes
  if (path === "/login" || path === "/forgot-password") {
    if (token) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // Protected routes
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

## Deployment

### Docker Compose Full Stack

Use `docker-compose.full.yml` to deploy the complete stack:

```bash
# Start all services
docker-compose -f docker-compose.full.yml up -d

# View logs
docker-compose -f docker-compose.full.yml logs -f

# Stop all services
docker-compose -f docker-compose.full.yml down
```

### Services Included

1. **MySQL** - Database server
2. **Backend** - Spring Boot API
3. **Frontend** - Next.js application
4. **Nginx** - Reverse proxy

### Health Checks

All services include health checks:

```bash
# Check MySQL health
docker exec banco-mysql mysqladmin ping -h localhost -u root -prootpassword

# Check Backend health
curl http://localhost:8080/actuator/health

# Check Frontend health
curl http://localhost:3000/health

# Check Proxy health
curl http://localhost/health
```

## Troubleshooting

### Common Issues

#### Backend Connection Failed

**Problem**: Frontend cannot connect to backend

**Solution**:
1. Check if backend is running: `curl http://localhost:8080/actuator/health`
2. Verify API URL in environment variables
3. Check network connectivity
4. Verify CORS configuration

#### Token Refresh Failed

**Problem**: Automatic token refresh not working

**Solution**:
1. Check refresh token storage
2. Verify refresh endpoint is accessible
3. Check token expiration time
4. Review browser console for errors

#### Demo Mode Not Working

**Problem**: Mock data not loading

**Solution**:
1. Verify `NEXT_PUBLIC_ENABLE_DEMO_MODE=true`
2. Check mock data imports
3. Verify mock delay configuration
4. Check browser console for errors

#### Build Errors

**Problem**: TypeScript or build errors

**Solution**:
1. Run `npm run type-check`
2. Run `npm run lint`
3. Fix type errors
4. Clean build: `rm -rf .next && npm run build`

## Testing

### Manual Testing Checklist

- [ ] Login with valid credentials
- [ ] Token refresh works automatically
- [ ] Dashboard loads correctly
- [ ] Account operations work
- [ ] Transfer operations work
- [ ] Loan operations work
- [ ] Batch operations work
- [ ] User management works
- [ ] Audit logs display correctly
- [ ] RBAC restrictions work
- [ ] Demo mode works
- [ ] Error handling works
- [ ] Toast notifications display

### Integration Testing

```bash
# Run unit tests
npm run test:unit

# Run E2E tests
npm run test:e2e

# Run type check
npm run type-check

# Run lint
npm run lint
```

## Support

### Contact Information

- **DevOps Team**: devops@bancoddd.com
- **Backend Team**: backend@bancoddd.com
- **Frontend Team**: frontend@bancoddd.com

### Documentation

- [Frontend Architecture](./FRONTEND_ARCHITECTURE.md)
- [API Integration](./API_INTEGRATION.md)
- [Security Guide](./SECURITY_FRONTEND.md)
- [Performance Guide](./PERFORMANCE_GUIDE.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Run Locally](./RUN_LOCAL.md)
- [Troubleshooting](./TROUBLESHOOTING.md)
