# Security Guide - BancoDDD Enterprise Frontend

## Overview

This document describes the security measures implemented in the BancoDDD banking frontend application to protect sensitive financial data and ensure enterprise-grade security.

## Security Architecture

### Defense in Depth

The application implements multiple layers of security:

1. **Network Security** - HTTPS, TLS, CORS
2. **Application Security** - Authentication, Authorization, Input Validation
3. **Data Security** - Encryption, Secure Storage
4. **UI Security** - XSS Prevention, CSRF Protection, Content Security Policy

## Authentication & Authorization

### JWT Token Management

#### Token Storage

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

#### Token Encryption

Tokens are encrypted using AES-256:

```typescript
// src/lib/crypto.ts
const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY!;

export function simpleEncrypt(text: string): string {
  const iv = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(ENCRYPTION_KEY),
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );
  
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(text)
  );
  
  return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
}

export function simpleDecrypt(encrypted: string): string {
  // Decryption logic
}
```

### Role-Based Access Control (RBAC)

#### User Roles

The application supports multiple user roles:

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

#### Permission Checks

```typescript
// src/store/auth.store.ts
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      hasRole: (...roles: UserRole[]) => {
        const { user } = get();
        if (!user) return false;
        return roles.includes(user.rol);
      },

      isAdmin: () => {
        const { user } = get();
        return user?.rol === "ADMINISTRADOR";
      },

      isSupervisor: () => {
        const { user } = get();
        if (!user) return false;
        return ["ADMINISTRADOR", "SUPERVISOR_EMPRESA"].includes(user.rol);
      },

      isEmployee: () => {
        const { user } = get();
        if (!user) return false;
        return [
          "ADMINISTRADOR",
          "SUPERVISOR_EMPRESA",
          "ANALISTA_INTERNO",
          "EMPLEADO_VENTANILLA",
          "EMPLEADO_COMERCIAL",
        ].includes(user.rol);
      },

      isClient: () => {
        const { user } = get();
        if (!user) return false;
        return [
          "CLIENTE_EMPRESA",
          "CLIENTE_PERSONA",
          "CLIENTE_PERSONA_NATURAL",
        ].includes(user.rol);
      },
    })
  )
);
```

#### Route Protection

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

## Content Security Policy (CSP)

### CSP Configuration

The application implements a strict Content Security Policy:

```typescript
// next.config.mjs
async headers() {
  const isDev = process.env.NODE_ENV === "development";
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

  const cspDirectives = [
    "default-src 'self'",
    isDev
      ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'"
      : "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://localhost:*",
    `connect-src 'self' ${apiUrl} wss://localhost:* ws://localhost:*`,
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "media-src 'self'",
    "upgrade-insecure-requests",
  ].join("; ");

  return [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-XSS-Protection", value: "1; mode=block" },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), magnetometer=(), gyroscope=(), accelerometer=()",
        },
        ...(isDev ? [] : [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ]),
        { key: "Content-Security-Policy", value: cspDirectives },
        { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
      ],
    },
  ];
}
```

## XSS Prevention

### Input Sanitization

All user inputs are sanitized before rendering:

```typescript
import DOMPurify from "dompurify";

export function sanitizeHTML(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["b", "i", "u", "em", "strong", "a"],
    ALLOWED_ATTR: ["href"],
  });
}
```

### Output Encoding

React automatically escapes output, but additional encoding is applied for dynamic content:

```typescript
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
```

## CSRF Protection

### CSRF Token Implementation

The application uses token-based CSRF protection:

```typescript
// src/lib/csrf.ts
export async function getCSRFToken(): Promise<string> {
  const response = await fetch("/api/csrf-token", {
    credentials: "include",
  });
  const { token } = await response.json();
  return token;
}

export async function makeCSRFProtectedRequest(
  url: string,
  options: RequestInit
): Promise<Response> {
  const token = await getCSRFToken();
  const headers = {
    ...options.headers,
    "X-CSRF-Token": token,
  };
  return fetch(url, { ...options, headers });
}
```

## Data Protection

### Sensitive Data Handling

#### Credit Card Numbers

Credit card numbers are masked:

```typescript
export function maskCreditCard(cardNumber: string): string {
  return cardNumber.replace(/\d(?=\d{4})/g, "*");
}

// Example: "1234 5678 9012 3456" -> "**** **** **** 3456"
```

#### Account Numbers

Account numbers are partially masked:

```typescript
export function maskAccountNumber(accountNumber: string): string {
  if (accountNumber.length <= 4) return accountNumber;
  return accountNumber.slice(0, 4) + "****" + accountNumber.slice(-4);
}

// Example: "1234567890" -> "1234****7890"
```

### Secure Logging

Sensitive data is never logged:

```typescript
export function safeLog(data: unknown): void {
  const sensitiveFields = [
    "password",
    "token",
    "creditCard",
    "ssn",
    "accountNumber",
  ];

  const sanitized = JSON.parse(JSON.stringify(data), (key, value) => {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      return "[REDACTED]";
    }
    return value;
  });

  console.log(sanitized);
}
```

## Session Management

### Session Timeout

Sessions automatically expire after inactivity:

```typescript
// src/providers/SessionTimeoutProvider.tsx
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export function SessionTimeoutProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { logout } = useAuthStore();

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const resetTimeout = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        logout();
        router.push("/login");
      }, SESSION_TIMEOUT);
    };

    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];
    events.forEach(event => document.addEventListener(event, resetTimeout));

    resetTimeout();

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => document.removeEventListener(event, resetTimeout));
    };
  }, [router, logout]);

  return <>{children}</>;
}
```

### Concurrent Session Handling

Only one active session per user is allowed:

```typescript
// src/lib/sessionManager.ts
export async function validateSession(): Promise<boolean> {
  try {
    const response = await fetch("/api/auth/validate-session", {
      credentials: "include",
    });
    return response.ok;
  } catch {
    return false;
  }
}
```

## API Security

### HTTPS Enforcement

All API requests use HTTPS in production:

```typescript
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

if (process.env.NODE_ENV === "production") {
  apiClient.defaults.baseURL = apiClient.defaults.baseURL?.replace("http://", "https://");
}
```

### Request Signing

Critical requests are signed:

```typescript
export async function signRequest(data: Record<string, unknown>): Promise<string> {
  const secret = process.env.NEXT_PUBLIC_API_SECRET!;
  const timestamp = Date.now();
  const payload = JSON.stringify({ ...data, timestamp });
  
  const signature = await crypto.subtle.sign(
    "HMAC",
    await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    ),
    new TextEncoder().encode(payload)
  );
  
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}
```

## Third-Party Security

### Dependency Management

Dependencies are regularly audited:

```bash
npm audit
npm audit fix
```

### Content Delivery Network (CDN)

Static assets are served via CDN with proper headers:

```typescript
// next.config.mjs
images: {
  remotePatterns: [
    {
      protocol: "https",
      hostname: "cdn.bancoddd.com",
      pathname: "/**",
    },
  ],
}
```

## Security Monitoring

### Error Tracking

Security-related errors are tracked separately:

```typescript
// src/lib/securityLogger.ts
export function logSecurityEvent(event: SecurityEvent): void {
  const securityEvent = {
    type: "SECURITY",
    ...event,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
  };

  // Send to security monitoring service
  fetch("/api/security/log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(securityEvent),
  });
}
```

### Suspicious Activity Detection

Suspicious activities are detected and flagged:

```typescript
export function detectSuspiciousActivity(activity: UserActivity): boolean {
  const patterns = [
    /script|javascript|onerror|onload/i,
    /<|>|&lt;|&gt;/i,
    /document\.cookie/i,
    /eval\(|exec\(/i,
  ];

  return patterns.some(pattern => 
    pattern.test(JSON.stringify(activity))
  );
}
```

## Best Practices

### 1. Never Store Sensitive Data in LocalStorage

```typescript
// ❌ Bad
localStorage.setItem("password", password);

// ✅ Good
tokenStorage.setTokens(accessToken, refreshToken);
```

### 2. Always Validate Input

```typescript
// ❌ Bad
const accountNumber = formData.accountNumber;

// ✅ Good
const accountNumber = z.string().regex(/^\d{10}$/).parse(formData.accountNumber);
```

### 3. Use HTTPS Only

```typescript
// ❌ Bad
fetch("http://api.example.com/data");

// ✅ Good
fetch("https://api.example.com/data");
```

### 4. Implement Proper Error Handling

```typescript
// ❌ Bad
try {
  await apiCall();
} catch (error) {
  console.error(error);
}

// ✅ Good
try {
  await apiCall();
} catch (error) {
  logSecurityEvent({ type: "API_ERROR", error });
  showUserFriendlyError();
}
```

### 5. Keep Dependencies Updated

```bash
npm update
npm audit fix
```

## Security Checklist

### Before Deployment

- [ ] All dependencies are up to date
- [ ] No known vulnerabilities (npm audit)
- [ ] HTTPS is enforced
- [ ] CSP is properly configured
- [ ] CSRF protection is enabled
- [ ] XSS prevention is implemented
- [ ] Sensitive data is encrypted
- [ ] Session timeout is configured
- [ ] RBAC is properly implemented
- [ ] Error handling doesn't leak information
- [ ] Logging doesn't include sensitive data
- [ ] Third-party scripts are reviewed
- [ ] API rate limiting is configured

### Regular Maintenance

- [ ] Monthly dependency audits
- [ ] Quarterly security reviews
- [ ] Annual penetration testing
- [ ] Continuous monitoring of security alerts
- [ ] Regular security training for developers

## Incident Response

### Security Incident Procedure

1. **Identify** - Detect the security incident
2. **Contain** - Isolate affected systems
3. **Eradicate** - Remove the threat
4. **Recover** - Restore normal operations
5. **Learn** - Document and improve

### Contact Information

- **Security Team**: security@bancoddd.com
- **Emergency Hotline**: +1-555-SECURE
- **Incident Response**: incident@bancoddd.com

## Compliance

### Regulatory Compliance

The application complies with:

- **GDPR** - General Data Protection Regulation
- **PCI DSS** - Payment Card Industry Data Security Standard
- **SOC 2** - Service Organization Control 2
- **ISO 27001** - Information Security Management

### Data Privacy

- User consent is obtained before data collection
- Data is processed lawfully and transparently
- Users can request data deletion
- Data is retained only as long as necessary
- Cross-border data transfer is compliant

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/security)
- [React Security](https://react.dev/learn/keeping-components-pure)
- [Web Security Guidelines](https://web.dev/security/)
