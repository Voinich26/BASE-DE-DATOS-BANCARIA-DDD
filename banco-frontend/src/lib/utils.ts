import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { UserRole } from "@/types/api.types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Currency formatting ───────────────────────────────────────────────────────

export function formatCurrency(
  amount: number,
  currency: string = "COP",
  locale: string = "es-CO"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-CO").format(value);
}

// ── Date formatting ───────────────────────────────────────────────────────────

/**
 * Normaliza un valor de fecha que puede venir como:
 * - string ISO: "2026-05-24" o "2026-05-24T10:00:00"
 * - array Java: [2026, 5, 24] o [2026, 5, 24, 10, 0, 0]
 * - null / undefined
 */
function toDate(value: unknown): Date | null {
  if (!value) return null;
  // Array de Java: [year, month, day] — month es 1-based en Java
  if (Array.isArray(value)) {
    const [y, m, d, h = 0, min = 0, s = 0] = value as number[];
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d, h, min, s);
  }
  if (typeof value === "number") return new Date(value);
  const date = new Date(String(value));
  return isNaN(date.getTime()) ? null : date;
}

export function formatDate(dateStr: unknown): string {
  const date = toDate(dateStr);
  if (!date) return "—";
  try {
    return new Intl.DateTimeFormat("es-CO", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  } catch {
    return "—";
  }
}

export function formatDateTime(dateStr: unknown): string {
  const date = toDate(dateStr);
  if (!date) return "—";
  try {
    return new Intl.DateTimeFormat("es-CO", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return "—";
  }
}

export function formatRelativeTime(dateStr: unknown): string {
  const date = toDate(dateStr);
  if (!date) return "—";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Ahora mismo";
  if (diffMins < 60) return `Hace ${diffMins} min`;
  if (diffHours < 24) return `Hace ${diffHours}h`;
  if (diffDays < 7) return `Hace ${diffDays}d`;
  return formatDate(dateStr);
}

// ── Role helpers ──────────────────────────────────────────────────────────────

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMINISTRADOR: "Administrador",
  SUPERVISOR_EMPRESA: "Supervisor",
  ANALISTA_INTERNO: "Analista",
  EMPLEADO_VENTANILLA: "Ventanilla",
  EMPLEADO_COMERCIAL: "Comercial",
  CLIENTE_EMPRESA: "Empresa",
  CLIENTE_PERSONA: "Cliente",
  CLIENTE_PERSONA_NATURAL: "Cliente",
};

export const ROLE_COLORS: Record<UserRole, string> = {
  ADMINISTRADOR: "bg-red-500/20 text-red-400 border-red-500/30",
  SUPERVISOR_EMPRESA: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  ANALISTA_INTERNO: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  EMPLEADO_VENTANILLA: "bg-green-500/20 text-green-400 border-green-500/30",
  EMPLEADO_COMERCIAL: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  CLIENTE_EMPRESA: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  CLIENTE_PERSONA: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  CLIENTE_PERSONA_NATURAL: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

export function getRoleLabel(role: UserRole): string {
  return ROLE_LABELS[role] ?? role;
}

export function getRoleColor(role: UserRole): string {
  return ROLE_COLORS[role] ?? "bg-slate-500/20 text-slate-400";
}

// ── Status helpers ────────────────────────────────────────────────────────────

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    Activa: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    Activo: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    Bloqueada: "bg-red-500/20 text-red-400 border-red-500/30",
    Bloqueado: "bg-red-500/20 text-red-400 border-red-500/30",
    Cancelada: "bg-slate-500/20 text-slate-400 border-slate-500/30",
    Inactivo: "bg-slate-500/20 text-slate-400 border-slate-500/30",
    Ejecutada: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    Pendiente: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    "En Espera de Aprobacion": "bg-blue-500/20 text-blue-400 border-blue-500/30",
    Rechazada: "bg-red-500/20 text-red-400 border-red-500/30",
    Rechazado: "bg-red-500/20 text-red-400 border-red-500/30",
    Vencida: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    Procesado: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    Aprobado: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    Desembolsado: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    Solicitado: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    "En Revision": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  };
  return map[status] ?? "bg-slate-500/20 text-slate-400 border-slate-500/30";
}

// ── Permission helpers ────────────────────────────────────────────────────────

export function hasRole(userRole: UserRole, ...roles: UserRole[]): boolean {
  return roles.includes(userRole);
}

export function isAdmin(role: UserRole): boolean {
  return role === "ADMINISTRADOR";
}

export function isSupervisor(role: UserRole): boolean {
  return hasRole(role, "ADMINISTRADOR", "SUPERVISOR_EMPRESA");
}

export function isAnalyst(role: UserRole): boolean {
  return hasRole(role, "ADMINISTRADOR", "ANALISTA_INTERNO");
}

export function isEmployee(role: UserRole): boolean {
  return hasRole(
    role,
    "ADMINISTRADOR",
    "SUPERVISOR_EMPRESA",
    "ANALISTA_INTERNO",
    "EMPLEADO_VENTANILLA",
    "EMPLEADO_COMERCIAL"
  );
}

export function isClient(role: UserRole): boolean {
  return hasRole(role, "CLIENTE_EMPRESA", "CLIENTE_PERSONA", "CLIENTE_PERSONA_NATURAL");
}

// ── Misc ──────────────────────────────────────────────────────────────────────

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

export function maskAccountNumber(account: string): string {
  if (!account) return "—";
  const parts = account.split("-");
  if (parts.length === 3) {
    return `${parts[0]}-****${parts[1].slice(-3)}-${parts[2]}`;
  }
  return account;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}
