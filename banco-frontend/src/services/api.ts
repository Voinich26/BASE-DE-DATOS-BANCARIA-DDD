import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { parseApiError } from "@/lib/error/parser";
import type { ApiResponse } from "@/types/api.types";
import { toast } from "sonner";

// ── Constants ─────────────────────────────────────────────────────────────────

// NEXT_PUBLIC_API_URL debe ser solo el origen: http://localhost:8081
// El context-path /api está en el servidor; las rutas de servicio ya incluyen /v1/...
const _RAW_API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081";
const API_BASE_URL = _RAW_API_URL.replace(/\/api(\/v\d+)?\/?$/, "") + "/api";
const ACCESS_TOKEN_KEY = "banco_access_token";
const REFRESH_TOKEN_KEY = "banco_refresh_token";
const TOKEN_EXPIRY_KEY = "banco_token_expiry";

// ── Simple encryption for localStorage (production should use HttpOnly cookies) ──

const ENCRYPTION_KEY = "banco_secure_key_v1";

function simpleEncrypt(text: string): string {
  if (typeof window === "undefined") return text;
  try {
    const encoded = btoa(text);
    const key = ENCRYPTION_KEY;
    let encrypted = "";
    for (let i = 0; i < encoded.length; i++) {
      encrypted += String.fromCharCode(
        encoded.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }
    return btoa(encrypted);
  } catch {
    return text;
  }
}

function simpleDecrypt(encrypted: string): string {
  if (typeof window === "undefined") return encrypted;
  try {
    const decoded = atob(encrypted);
    const key = ENCRYPTION_KEY;
    let decrypted = "";
    for (let i = 0; i < decoded.length; i++) {
      decrypted += String.fromCharCode(
        decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }
    return atob(decrypted);
  } catch {
    return encrypted;
  }
}

// ── Token storage (secure, no XSS via httpOnly would be ideal in prod) ────────

function getTokenExpiry(): number | null {
  if (typeof window === "undefined") return null;
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  return expiry ? parseInt(expiry, 10) : null;
}

function isTokenExpired(): boolean {
  const expiry = getTokenExpiry();
  if (!expiry) return false;
  return Date.now() >= expiry;
}

function clearTokens(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
}

export const tokenStorage = {
  getAccessToken: (): string | null => {
    if (typeof window === "undefined") return null;
    const encrypted = sessionStorage.getItem(ACCESS_TOKEN_KEY) ?? localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!encrypted) return null;
    try {
      return simpleDecrypt(encrypted);
    } catch {
      return null;
    }
  },
  getRefreshToken: (): string | null => {
    if (typeof window === "undefined") return null;
    const encrypted = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!encrypted) return null;
    try {
      return simpleDecrypt(encrypted);
    } catch {
      return null;
    }
  },
  getTokenExpiry,
  isTokenExpired,
  setTokens: (accessToken: string, refreshToken: string, remember = false, expiresIn?: number): void => {
    if (typeof window === "undefined") return;
    const encryptedAccess = simpleEncrypt(accessToken);
    const encryptedRefresh = simpleEncrypt(refreshToken);
    
    if (remember) {
      localStorage.setItem(ACCESS_TOKEN_KEY, encryptedAccess);
    } else {
      sessionStorage.setItem(ACCESS_TOKEN_KEY, encryptedAccess);
    }
    localStorage.setItem(REFRESH_TOKEN_KEY, encryptedRefresh);
    
    // Store token expiry
    if (expiresIn) {
      localStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + expiresIn * 1000));
    }
  },
  clearTokens,
  rotateTokens: (newAccessToken: string, newRefreshToken: string, expiresIn?: number): void => {
    clearTokens();
    tokenStorage.setTokens(newAccessToken, newRefreshToken, true, expiresIn);
  },
};

// ── Axios instance ────────────────────────────────────────────────────────────

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// ── Request interceptor — attach JWT ─────────────────────────────────────────

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenStorage.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor — handle 401 + refresh rotation ─────────────────────

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: string) => void;
  reject: (reason: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token!);
    }
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Only attempt refresh on 401, not on auth endpoints themselves
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/v1/auth/")
    ) {
      if (isRefreshing) {
        // Queue the request while refresh is in progress
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = tokenStorage.getRefreshToken();

      if (!refreshToken) {
        processQueue(error, null);
        isRefreshing = false;
        tokenStorage.clearTokens();
        if (typeof window !== "undefined") {
          toast.error("Sesión expirada. Por favor inicie sesión nuevamente.");
          window.location.href = "/login";
        }
        return Promise.reject(error);
      }

      try {
        const response = await axios.post<ApiResponse<{
          accessToken: string;
          refreshToken: string;
        }>>(`${API_BASE_URL}/v1/auth/refresh`, { refreshToken });

        const { accessToken, refreshToken: newRefreshToken } = response.data.data;
        tokenStorage.setTokens(accessToken, newRefreshToken);

        processQueue(null, accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        tokenStorage.clearTokens();
        if (typeof window !== "undefined") {
          toast.error("Sesión expirada. Por favor inicie sesión nuevamente.");
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      toast.error("No tiene permisos para realizar esta acción");
      return Promise.reject(error);
    }

    // Handle 404 Not Found
    if (error.response?.status === 404) {
      toast.error("Recurso no encontrado");
      return Promise.reject(error);
    }

    // Handle 500 Server Error
    if (error.response?.status >= 500) {
      toast.error("Error del servidor. Por favor intente nuevamente más tarde");
      return Promise.reject(error);
    }

    // Handle network errors
    if (!error.response && error.request) {
      toast.error("Error de conexión. Verifique su red");
      return Promise.reject(error);
    }

    // Handle timeout
    if (error.code === "ECONNABORTED") {
      toast.error("Tiempo de espera agotado");
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

// ── Typed request helpers ─────────────────────────────────────────────────────

export async function apiGet<T>(
  url: string,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> {
  const response = await api.get<ApiResponse<T>>(url, config);
  return response.data;
}

export async function apiPost<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> {
  const response = await api.post<ApiResponse<T>>(url, data, config);
  return response.data;
}

export async function apiPatch<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> {
  const response = await api.patch<ApiResponse<T>>(url, data, config);
  return response.data;
}

export async function apiPut<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> {
  const response = await api.put<ApiResponse<T>>(url, data, config);
  return response.data;
}

export async function apiDelete<T>(
  url: string,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> {
  const response = await api.delete<ApiResponse<T>>(url, config);
  return response.data;
}

// ── Error extraction ──────────────────────────────────────────────────────────

export function extractErrorMessage(error: unknown): string {
  return parseApiError(error).message;
}

export function getParsedApiError(error: unknown) {
  return parseApiError(error);
}

export default api;
