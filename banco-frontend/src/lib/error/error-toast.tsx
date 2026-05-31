"use client";

import { toast } from "sonner";
import { parseApiError, type ParsedApiError } from "./parser";
import { AlertTriangle, AlertCircle, Info, CheckCircle2, XCircle, RefreshCw } from "lucide-react";

export interface ErrorToastOptions {
  title?: string;
  description?: string;
  actionLabel?: string;
  action?: () => void;
  duration?: number;
}

/**
 * Enterprise error toast with banking-grade messaging
 */
export function showErrorToast(error: unknown, options: ErrorToastOptions = {}) {
  const parsed = parseApiError(error);
  
  const icon = getErrorIcon(parsed);
  const title = options.title ?? parsed.title;
  const description = options.description ?? parsed.message;

  toast.error(title, {
    description,
    icon,
    duration: options.duration ?? 5000,
    action: options.action
      ? {
          label: options.actionLabel ?? "Reintentar",
          onClick: options.action,
        }
      : undefined,
  });
}

/**
 * Success toast with banking confirmation
 */
export function showSuccessToast(title: string, description?: string, options?: ErrorToastOptions) {
  toast.success(title, {
    description,
    icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
    duration: options?.duration ?? 4000,
  });
}

/**
 * Warning toast for banking alerts
 */
export function showWarningToast(title: string, description?: string, options?: ErrorToastOptions) {
  toast.warning(title, {
    description,
    icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
    duration: options?.duration ?? 5000,
  });
}

/**
 * Info toast for banking notifications
 */
export function showInfoToast(title: string, description?: string, options?: ErrorToastOptions) {
  toast.info(title, {
    description,
    icon: <Info className="h-5 w-5 text-blue-500" />,
    duration: options?.duration ?? 4000,
  });
}

/**
 * Retry toast with automatic retry action
 */
export function showRetryToast(
  error: unknown,
  onRetry: () => void,
  options?: ErrorToastOptions
) {
  const parsed = parseApiError(error);
  
  toast.error(parsed.title, {
    description: parsed.message,
    icon: <RefreshCw className="h-5 w-5 text-orange-500 animate-spin" />,
    duration: options?.duration ?? 6000,
    action: {
      label: "Reintentar",
      onClick: onRetry,
    },
  });
}

/**
 * Get appropriate icon based on error type
 */
function getErrorIcon(error: ParsedApiError) {
  if (error.isAuthError) {
    return <XCircle className="h-5 w-5 text-red-500" />;
  }
  if (error.isForbidden) {
    return <AlertCircle className="h-5 w-5 text-red-500" />;
  }
  if (error.isNotFound) {
    return <AlertCircle className="h-5 w-5 text-orange-500" />;
  }
  if (error.isConflict) {
    return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
  }
  if (error.isValidationError) {
    return <AlertCircle className="h-5 w-5 text-orange-500" />;
  }
  if (error.isTooManyRequests) {
    return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
  }
  if (error.isNetworkError || error.isTimeout) {
    return <AlertTriangle className="h-5 w-5 text-orange-500" />;
  }
  return <XCircle className="h-5 w-5 text-red-500" />;
}

/**
 * Banking-specific toast messages
 */
export const BankingToastMessages = {
  transfer: {
    success: {
      title: "Transferencia exitosa",
      description: "Su transferencia ha sido procesada correctamente.",
    },
    pending: {
      title: "Transferencia en proceso",
      description: "Su transferencia está siendo procesada por el sistema.",
    },
    requiresApproval: {
      title: "Aprobación requerida",
      description: "Su transferencia requiere aprobación del supervisor.",
    },
    insufficientFunds: {
      title: "Fondos insuficientes",
      description: "No cuenta con saldo suficiente para realizar esta transferencia.",
    },
  },
  loan: {
    submitted: {
      title: "Solicitud enviada",
      description: "Su solicitud de préstamo ha sido recibida y está en revisión.",
    },
    approved: {
      title: "Préstamo aprobado",
      description: "Su préstamo ha sido aprobado. El desembolso se realizará pronto.",
    },
    rejected: {
      title: "Préstamo rechazado",
      description: "Su solicitud de préstamo no ha sido aprobada.",
    },
  },
  account: {
    created: {
      title: "Cuenta creada",
      description: "Su cuenta bancaria ha sido creada exitosamente.",
    },
    blocked: {
      title: "Cuenta bloqueada",
      description: "Su cuenta ha sido bloqueada por seguridad. Contacte al banco.",
    },
  },
  auth: {
    loginSuccess: {
      title: "Bienvenido",
      description: "Ha iniciado sesión correctamente.",
    },
    logoutSuccess: {
      title: "Sesión cerrada",
      description: "Ha cerrado su sesión de forma segura.",
    },
    sessionExpired: {
      title: "Sesión expirada",
      description: "Su sesión ha expirado. Inicie sesión nuevamente.",
    },
  },
};
