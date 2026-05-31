# API Integration Guide - BancoDDD Enterprise

## Overview

This document describes how the frontend integrates with the BancoDDD backend API, including authentication, data fetching, error handling, and best practices.

## Base Configuration

### API Base URL

The API base URL is configured via environment variable:

```env
NEXT_PUBLIC_API_URL=https://api.bancoddd.com/v1
```

### API Client

The application uses Axios as the HTTP client with custom interceptors for authentication and error handling.

```typescript
// src/services/api.ts
import axios from "axios";

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});
```

## Authentication

### JWT Token Management

The application uses JWT tokens for authentication:

- **Access Token**: Short-lived token for API requests
- **Refresh Token**: Long-lived token for obtaining new access tokens

### Token Storage

Tokens are stored securely using encrypted storage:

```typescript
// src/lib/tokenStorage.ts
export const tokenStorage = {
  getAccessToken: (): string | null => {
    const encrypted = sessionStorage.getItem(ACCESS_TOKEN_KEY) ?? 
                      localStorage.getItem(ACCESS_TOKEN_KEY);
    return encrypted ? simpleDecrypt(encrypted) : null;
  },
  
  setTokens: (accessToken: string, refreshToken: string, remember = false) => {
    const encryptedAccess = simpleEncrypt(accessToken);
    const encryptedRefresh = simpleEncrypt(refreshToken);
    
    if (remember) {
      localStorage.setItem(ACCESS_TOKEN_KEY, encryptedAccess);
    } else {
      sessionStorage.setItem(ACCESS_TOKEN_KEY, encryptedAccess);
    }
    localStorage.setItem(REFRESH_TOKEN_KEY, encryptedRefresh);
  },
  
  clearTokens: () => {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};
```

### Request Interceptor

The request interceptor automatically adds the access token to all API requests:

```typescript
apiClient.interceptors.request.use(
  (config) => {
    const token = tokenStorage.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);
```

### Response Interceptor

The response interceptor handles token refresh and errors:

```typescript
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Token refresh logic
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = tokenStorage.getRefreshToken();
        const response = await authService.refreshToken(refreshToken);
        
        tokenStorage.setTokens(
          response.data.accessToken,
          response.data.refreshToken
        );
        
        originalRequest.headers.Authorization = 
          `Bearer ${response.data.accessToken}`;
        
        return apiClient(originalRequest);
      } catch (refreshError) {
        tokenStorage.clearTokens();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);
```

## API Services

### Service Layer Pattern

API calls are organized into service modules:

```typescript
// src/services/account.service.ts
import { apiGet, apiPost, apiPatch } from "./api";
import type { CuentaBancariaResponse, PagedResponse } from "@/types/api.types";

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

  async getByNumber(accountNumber: string): Promise<CuentaBancariaResponse> {
    const res = await apiGet<CuentaBancariaResponse>(`/v1/accounts/${accountNumber}`);
    return res.data;
  },
};
```

### Available Services

- **account.service.ts** - Account operations
- **transfer.service.ts** - Transfer operations
- **loan.service.ts** - Loan operations
- **user.service.ts** - User operations
- **auth.service.ts** - Authentication operations

## Data Fetching with TanStack Query

### Query Configuration

The application uses TanStack Query for server state management:

```typescript
// src/hooks/useAccounts.ts
import { useQuery } from "@tanstack/react-query";
import { accountService } from "@/services/account.service";

export function useAccounts(page = 0, size = 20) {
  return useQuery({
    queryKey: ["accounts", page, size],
    queryFn: () => accountService.getAll(page, size),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
```

### Mutation Configuration

Mutations are used for data modifications:

```typescript
// src/hooks/useTransfer.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { transferService } from "@/services/transfer.service";
import { toast } from "sonner";

export function useTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: transferService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Transfer completed successfully");
    },
    onError: (error) => {
      toast.error("Transfer failed");
    },
  });
}
```

## Error Handling

### Error Types

The application handles different types of errors:

1. **Network Errors** - Connection issues
2. **Authentication Errors** - 401 Unauthorized
3. **Validation Errors** - 400 Bad Request
4. **Server Errors** - 500 Internal Server Error
5. **Business Logic Errors** - Custom error codes

### Error Response Format

API errors follow a standard format:

```typescript
interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
}
```

### Error Handling Strategy

```typescript
try {
  const result = await accountService.getByNumber("123456");
  // Handle success
} catch (error) {
  if (axios.isAxiosError(error)) {
    switch (error.response?.status) {
      case 401:
        // Redirect to login
        break;
      case 403:
        // Show permission denied
        break;
      case 404:
        // Show not found
        break;
      case 500:
        // Show server error
        break;
      default:
        // Show generic error
    }
  }
}
```

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/auth/login` | User login |
| POST | `/v1/auth/logout` | User logout |
| POST | `/v1/auth/refresh` | Refresh access token |
| POST | `/v1/auth/forgot-password` | Request password reset |
| POST | `/v1/auth/reset-password` | Reset password |

### Accounts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/accounts` | List accounts (paginated) |
| GET | `/v1/accounts/dashboard` | Get dashboard data |
| GET | `/v1/accounts/{number}` | Get account by number |
| POST | `/v1/accounts` | Create new account |
| POST | `/v1/accounts/deposit` | Deposit to account |
| POST | `/v1/accounts/withdraw` | Withdraw from account |
| PATCH | `/v1/accounts/{number}/block` | Block account |
| PATCH | `/v1/accounts/{number}/reactivate` | Reactivate account |
| PATCH | `/v1/accounts/{number}/cancel` | Cancel account |

### Transfers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/transfers` | List transfers (paginated) |
| GET | `/v1/transfers/{id}` | Get transfer by ID |
| POST | `/v1/transfers` | Create new transfer |
| POST | `/v1/transfers/{id}/cancel` | Cancel transfer |

### Loans

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/loans` | List loans (paginated) |
| GET | `/v1/loans/{id}` | Get loan by ID |
| POST | `/v1/loans` | Create new loan application |
| POST | `/v1/loans/{id}/approve` | Approve loan |
| POST | `/v1/loans/{id}/reject` | Reject loan |

### Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/users` | List users (paginated) |
| GET | `/v1/users/{id}` | Get user by ID |
| POST | `/v1/users` | Create new user |
| PATCH | `/v1/users/{id}` | Update user |
| DELETE | `/v1/users/{id}` | Delete user |

## Request/Response Examples

### Login Request

```typescript
POST /v1/auth/login
{
  "correoElectronico": "user@example.com",
  "contrasena": "password123"
}
```

### Login Response

```typescript
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": {
    "idUsuario": 1,
    "nombreCompleto": "John Doe",
    "correoElectronico": "john@example.com",
    "rol": "ADMINISTRADOR"
  }
}
```

### Create Transfer Request

```typescript
POST /v1/transfers
{
  "numeroCuentaOrigen": "123456",
  "numeroCuentaDestino": "789012",
  "monto": 1000.00,
  "moneda": "USD",
  "concepto": "Payment",
  "idUsuario": 1
}
```

### Create Transfer Response

```typescript
{
  "id": 1,
  "numeroCuentaOrigen": "123456",
  "numeroCuentaDestino": "789012",
  "monto": 1000.00,
  "estado": "COMPLETADO",
  "fechaCreacion": "2024-01-01T00:00:00Z"
}
```

## Best Practices

### 1. Always Handle Errors

```typescript
const { data, error, isLoading } = useAccounts();

if (error) {
  return <ErrorState error={error} />;
}

if (isLoading) {
  return <LoadingState />;
}
```

### 2. Use Optimistic Updates

```typescript
const mutation = useMutation({
  mutationFn: updateAccount,
  onMutate: async (newData) => {
    await queryClient.cancelQueries({ queryKey: ["accounts"] });
    const previousData = queryClient.getQueryData(["accounts"]);
    queryClient.setQueryData(["accounts"], newData);
    return { previousData };
  },
  onError: (err, newData, context) => {
    queryClient.setQueryData(["accounts"], context.previousData);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ["accounts"] });
  },
});
```

### 3. Implement Retry Logic

```typescript
const { data } = useQuery({
  queryKey: ["accounts"],
  queryFn: fetchAccounts,
  retry: 3,
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
});
```

### 4. Cache Strategically

```typescript
// Cache for 5 minutes
useQuery({
  queryKey: ["accounts"],
  queryFn: fetchAccounts,
  staleTime: 5 * 60 * 1000,
});

// No cache for real-time data
useQuery({
  queryKey: ["notifications"],
  queryFn: fetchNotifications,
  staleTime: 0,
  refetchInterval: 30000,
});
```

### 5. Use Type Safety

```typescript
// Define API response types
interface AccountResponse {
  numeroCuenta: string;
  tipoCuenta: string;
  saldo: number;
  estado: string;
}

// Use in service
async getAccount(number: string): Promise<AccountResponse> {
  const res = await apiGet<AccountResponse>(`/v1/accounts/${number}`);
  return res.data;
}
```

## Testing API Integration

### Unit Tests

```typescript
// src/services/__tests__/account.service.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { accountService } from "../account.service";

describe("AccountService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch accounts successfully", async () => {
    const mockAccounts = [
      { numeroCuenta: "123456", tipoCuenta: "Ahorros", saldo: 1000 },
    ];
    (apiGet as any).mockResolvedValue({ data: mockAccounts });

    const result = await accountService.getAll();

    expect(result).toEqual(mockAccounts);
  });
});
```

### Integration Tests

```typescript
// src/__tests__/api.integration.test.ts
import { describe, it, expect } from "vitest";
import { accountService } from "@/services/account.service";

describe("API Integration", () => {
  it("should fetch real data from API", async () => {
    const result = await accountService.getDashboard();
    
    expect(result).toHaveProperty("cuentas");
    expect(result).toHaveProperty("totalSaldo");
  });
});
```

## Monitoring

### API Performance Tracking

The application tracks API performance:

- Request duration
- Success rate
- Error rate
- Slow requests (> 3s)

### Error Tracking

All API errors are logged and tracked:

- Error type
- Endpoint
- Status code
- Timestamp
- User context

## Troubleshooting

### Common Issues

**401 Unauthorized**
- Check token expiration
- Verify token refresh logic
- Ensure token is stored correctly

**Network Errors**
- Check API base URL
- Verify network connectivity
- Check CORS configuration

**Slow Requests**
- Enable request caching
- Implement pagination
- Use data virtualization

**Memory Leaks**
- Clean up subscriptions
- Cancel pending requests on unmount
- Use proper cleanup in useEffect
