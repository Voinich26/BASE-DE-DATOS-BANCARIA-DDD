import { apiGet, apiPost, tokenStorage } from "./api";
import type {
  AuthResponse,
  ApiResponse,
  UsuarioInfoResponse,
} from "@/types/api.types";

// ── Request types ─────────────────────────────────────────────────────────────

export interface LoginRequest {
  correoElectronico: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface LogoutRequest {
  refreshToken: string;
}

export interface ChangePasswordRequest {
  passwordActual: string;
  passwordNuevo: string;
  passwordConfirmacion: string;
}

// ── Auth service ──────────────────────────────────────────────────────────────

function getSecureCookieFlag() {
  if (typeof window === "undefined") return "";
  return window.location.protocol === "https:" ? "; Secure" : "";
}

function setAuthPresenceCookie(remember = false) {
  if (typeof document === "undefined") return;
  const maxAge = remember ? 60 * 60 * 24 * 30 : undefined;
  const expires = maxAge ? `; max-age=${maxAge}` : "";
  document.cookie = `banco_auth_token=1; path=/; SameSite=Strict${expires}${getSecureCookieFlag()}`;
}

function clearAuthPresenceCookie() {
  if (typeof document === "undefined") return;
  document.cookie =
    "banco_auth_token=; path=/; SameSite=Strict; expires=Thu, 01 Jan 1970 00:00:00 GMT";
}

export const authService = {
  async login(credentials: LoginRequest, remember = false): Promise<AuthResponse> {
    const response = await apiPost<AuthResponse>("/v1/auth/login", credentials);
    if (response.success && response.data) {
      tokenStorage.setTokens(
        response.data.accessToken,
        response.data.refreshToken,
        remember,
        response.data.expiresIn || 86400
      );
      setAuthPresenceCookie(remember);
    }
    return response.data;
  },

  async refresh(): Promise<AuthResponse> {
    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) throw new Error("No refresh token available");
    const response = await apiPost<AuthResponse>("/v1/auth/refresh", { refreshToken });
    if (response.success && response.data) {
      tokenStorage.setTokens(
        response.data.accessToken,
        response.data.refreshToken,
        true,
        response.data.expiresIn || 86400
      );
    }
    return response.data;
  },

  async logout(): Promise<void> {
    const refreshToken = tokenStorage.getRefreshToken();
    if (refreshToken) {
      try {
        await apiPost<void>("/v1/auth/logout", { refreshToken });
      } catch {
        // Proceed with local cleanup even if server call fails
      }
    }
    tokenStorage.clearTokens();
    clearAuthPresenceCookie();
  },

  async changePassword(request: ChangePasswordRequest): Promise<ApiResponse<void>> {
    return apiPost<void>("/v1/auth/change-password", request);
  },

  async me(): Promise<UsuarioInfoResponse> {
    const response = await apiGet<UsuarioInfoResponse>("/v1/auth/me");
    return response.data;
  },

  isAuthenticated(): boolean {
    const token = tokenStorage.getAccessToken();
    if (!token) return false;
    if (tokenStorage.isTokenExpired()) {
      tokenStorage.clearTokens();
      return false;
    }
    return true;
  },

  shouldRefresh(): boolean {
    const token = tokenStorage.getAccessToken();
    if (!token) return false;
    // Refresh if expiry is within 5 minutes
    const expiry = tokenStorage.getTokenExpiry();
    if (!expiry) return false;
    return (expiry - Date.now()) < 5 * 60 * 1000;
  },
};
