"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Bell,
  Search,
  Sun,
  Moon,
  ChevronRight,
  LogOut,
  User,
  Settings,
  Shield,
  Building2,
  Command,
} from "lucide-react";
import { cn, getInitials, getRoleLabel, getRoleColor } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import { useUIStore } from "@/store/ui.store";
import { authService } from "@/services/auth.service";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { commandPaletteStore } from "@/components/enterprise/CommandPalette";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

// ── Breadcrumb map ────────────────────────────────────────────────────────────

const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  analytics: "Analytics",
  accounts: "Cuentas",
  transfers: "Transferencias",
  loans: "Préstamos",
  batches: "Pagos Masivos",
  users: "Usuarios",
  audit: "Bitácora",
  settings: "Configuración",
  login: "Iniciar Sesión",
  new: "Nuevo",
};

function useBreadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  return segments.map((seg, i) => ({
    label: ROUTE_LABELS[seg] ?? seg,
    href: "/" + segments.slice(0, i + 1).join("/"),
    isLast: i === segments.length - 1,
  }));
}

export function Topbar() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { theme, toggleTheme, unreadCount, markAllRead, notifications } = useUIStore();
  const breadcrumbs = useBreadcrumbs();

  // ── Global keyboard shortcuts ──────────────────────────────────────────────
  useKeyboardShortcuts([
    {
      key: "k",
      meta: true,
      description: "Abrir paleta de comandos",
      handler: () => commandPaletteStore.toggle(),
      ignoreInputs: false,
    },
    {
      key: "/",
      description: "Abrir paleta de comandos",
      handler: () => commandPaletteStore.setOpen(true),
    },
  ]);

  const handleLogout = async () => {
    await authService.logout();
    useAuthStore.getState().clearAuth();
    router.push("/login");
  };

  return (
    <header className="h-16 border-b border-border bg-card/80 backdrop-blur-sm flex items-center px-6 gap-4 shrink-0 sticky top-0 z-10">
      {/* ── Breadcrumbs ───────────────────────────────────────────────────── */}
      <nav className="flex items-center gap-1.5 flex-1 min-w-0">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Building2 className="w-4 h-4 text-primary shrink-0" />
          <span className="text-primary font-medium hidden sm:block">BancoDDD</span>
        </div>
        {breadcrumbs.map((crumb) => (
          <React.Fragment key={crumb.href}>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
            <span
              className={cn(
                "text-sm truncate",
                crumb.isLast
                  ? "text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              )}
              onClick={() => !crumb.isLast && router.push(crumb.href)}
            >
              {crumb.label}
            </span>
          </React.Fragment>
        ))}
      </nav>

      {/* ── Right actions ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Search / Command Palette trigger */}
        <Button
          variant="ghost"
          size="sm"
          className="hidden md:flex items-center gap-2 text-muted-foreground hover:text-foreground h-8 px-3 rounded-lg border border-border bg-secondary/50"
          onClick={() => commandPaletteStore.setOpen(true)}
          aria-label="Abrir paleta de comandos (⌘K)"
          title="Paleta de comandos (⌘K)"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="text-xs">Buscar...</span>
          <kbd className="ml-2 flex items-center gap-0.5 text-[10px] font-mono opacity-60">
            <Command className="w-2.5 h-2.5" />K
          </kbd>
        </Button>

        {/* Mobile search */}
        <Button
          variant="ghost"
          size="icon-sm"
          className="md:hidden"
          onClick={() => commandPaletteStore.setOpen(true)}
          aria-label="Buscar"
        >
          <Search className="w-4 h-4" />
        </Button>

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleTheme}
          title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
        >
          <motion.div
            key={theme}
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </motion.div>
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="relative" title="Notificaciones">
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary rounded-full text-[9px] font-bold text-white flex items-center justify-center"
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </motion.span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="flex items-center justify-between px-2 py-1.5">
              <DropdownMenuLabel className="p-0 text-sm font-semibold text-foreground">
                Notificaciones
              </DropdownMenuLabel>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-primary hover:underline"
                >
                  Marcar todas como leídas
                </button>
              )}
            </div>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Sin notificaciones
              </div>
            ) : (
              notifications.slice(0, 5).map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "px-3 py-2.5 rounded-lg mx-1 mb-0.5 cursor-pointer hover:bg-secondary transition-colors",
                    !n.read && "bg-primary/5"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div
                      className={cn(
                        "w-1.5 h-1.5 rounded-full mt-1.5 shrink-0",
                        n.type === "success" && "bg-emerald-400",
                        n.type === "error" && "bg-red-400",
                        n.type === "warning" && "bg-yellow-400",
                        n.type === "info" && "bg-blue-400"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">{n.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{n.message}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Profile dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-secondary transition-colors">
              <div className="relative">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="text-xs">
                    {user ? getInitials(user.nombreCompleto) : "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-400 rounded-full border-2 border-card" />
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold text-foreground leading-tight">
                  {user?.nombreCompleto?.split(" ")[0] ?? "Usuario"}
                </p>
                {user && (
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    {getRoleLabel(user.rol)}
                  </p>
                )}
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-2">
              <p className="text-sm font-semibold text-foreground">{user?.nombreCompleto}</p>
              <p className="text-xs text-muted-foreground">{user?.correoElectronico}</p>
              {user && (
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold mt-1",
                    getRoleColor(user.rol)
                  )}
                >
                  <Shield className="w-2.5 h-2.5 mr-1" />
                  {getRoleLabel(user.rol)}
                </span>
              )}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <User className="w-4 h-4" />
              Mi Perfil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <Settings className="w-4 h-4" />
              Configuración
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} danger>
              <LogOut className="w-4 h-4" />
              Cerrar Sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
