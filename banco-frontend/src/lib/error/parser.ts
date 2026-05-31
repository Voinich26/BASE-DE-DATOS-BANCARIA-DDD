import axios from "axios";
import type { ApiError, FieldError } from "@/types/api.types";

export interface ParsedApiError {
  status: number;
  title: string;
  message: string;
  code?: string;
  path?: string;
  timestamp?: string;
  fieldErrors?: FieldError[];
  retryable: boolean;
  isAuthError: boolean;
  isForbidden: boolean;
  isNotFound: boolean;
  isConflict: boolean;
  isValidationError: boolean;
  isTooManyRequests: boolean;
  isServerError: boolean;
  isNetworkError: boolean;
  isTimeout: boolean;
}

function parseFieldErrors(data: unknown): FieldError[] | undefined {
  if (!data || typeof data !== "object") return undefined;
  if (Array.isArray((data as Record<string, unknown>).fieldErrors)) {
    return (data as Record<string, unknown>).fieldErrors as FieldError[];
  }
  return undefined;
}

export function parseApiError(error: unknown): ParsedApiError {
  const parsed: ParsedApiError = {
    status: 0,
    title: "Error de comunicación",
    message: "Ha ocurrido un error inesperado.",
    retryable: false,
    isAuthError: false,
    isForbidden: false,
    isNotFound: false,
    isConflict: false,
    isValidationError: false,
    isTooManyRequests: false,
    isServerError: false,
    isNetworkError: false,
    isTimeout: false,
  };

  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? 0;
    const data = error.response?.data as ApiError | Record<string, unknown> | undefined;
    const serverMessage = data && typeof data.message === "string" ? data.message : undefined;

    parsed.status = status;
    parsed.code = data && typeof (data as ApiError).code === "string" ? (data as ApiError).code : undefined;
    parsed.path = data && typeof (data as Record<string, unknown>).path === "string" ? (data as Record<string, unknown>).path as string : undefined;
    parsed.timestamp = data && typeof (data as ApiError).timestamp === "string" ? (data as ApiError).timestamp : undefined;
    parsed.fieldErrors = parseFieldErrors(data);
    parsed.isAuthError = status === 401;
    parsed.isForbidden = status === 403;
    parsed.isNotFound = status === 404;
    parsed.isConflict = status === 409;
    parsed.isValidationError = status === 422;
    parsed.isTooManyRequests = status === 429;
    parsed.isServerError = status >= 500;
    parsed.isNetworkError = error.code === "ERR_NETWORK" || status === 0;
    parsed.isTimeout = error.code === "ECONNABORTED" || error.code === "ETIMEDOUT";
    parsed.retryable = parsed.isTooManyRequests || parsed.isServerError || parsed.isNetworkError || parsed.isTimeout;

    if (parsed.isAuthError) {
      parsed.title = "Autenticación requerida";
      parsed.message = "Sesión expirada o token inválido. Inicie sesión nuevamente.";
    } else if (parsed.isForbidden) {
      parsed.title = "Acceso denegado";
      parsed.message = "No tiene permisos para realizar esta acción.";
    } else if (parsed.isNotFound) {
      parsed.title = "Recurso no encontrado";
      parsed.message = "El recurso solicitado no existe o fue movido.";
    } else if (parsed.isConflict) {
      parsed.title = "Conflicto de datos";
      parsed.message = serverMessage ?? "La operación no puede completarse debido a un conflicto. El recurso puede haber sido modificado por otro usuario.";
    } else if (parsed.isValidationError) {
      parsed.title = "Error de validación";
      parsed.message = serverMessage ?? "Algunos datos no cumplen las reglas del banco.";
    } else if (parsed.isTooManyRequests) {
      parsed.title = "Demasiadas solicitudes";
      parsed.message = serverMessage ?? "Intente de nuevo en unos segundos.";
    } else if (parsed.isServerError) {
      parsed.title = "Error del servidor";
      parsed.message = serverMessage ?? "Hay un problema técnico en el backend. Intente más tarde.";
    } else if (parsed.isNetworkError) {
      parsed.title = "Sin conexión";
      parsed.message = "Verifique su conexión a Internet o que el backend esté disponible.";
    } else if (parsed.isTimeout) {
      parsed.title = "Tiempo de espera agotado";
      parsed.message = "La operación tomó más tiempo del esperado. Intente nuevamente.";
    } else {
      parsed.title = serverMessage ?? error.message ?? "Error desconocido";
      parsed.message = serverMessage ?? error.message ?? "Ha ocurrido un error inesperado.";
    }

    return parsed;
  }

  if (error instanceof Error) {
    parsed.message = error.message;
    parsed.title = "Error inesperado";
    return parsed;
  }

  return parsed;
}
