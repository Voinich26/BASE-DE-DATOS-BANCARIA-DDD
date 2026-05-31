"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  CreditCard,
  ArrowLeftRight,
  Landmark,
  Users,
  FileStack,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Building2,
  Shield,
  Bell,
  Activity,
  BarChart3,
} from "lucide-react";
import { cn, getInitials, getRoleLabel, getRoleColor } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import { useUIStore } from "@/store/ui.store";
import { authService } from "@/services/auth.service";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useRouter } from "next/navigation";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string | number;
  roles?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Cuentas", href: "/accounts", icon: CreditCard },
  { label: "Transferencias", href: "/transfers", icon: ArrowLeftRight },
  { label: "Préstamos", href: "/loans", icon: Landmark },
  { label: "Pagos Masivos", href: "/batches", icon: FileStack, roles: ["ADMINISTRADOR", "SUPERVISOR_EMPRESA", "CLIENTE_EMPRESA", "EMPLEADO_VENTANILLA"] },
  { label: "Usuarios", href: "/users", icon: Users, roles: ["ADMINISTRADOR", "SUPERVISOR_EMPRESA", "ANALISTA_INTERNO"] },
  { label: "Bitácora", href: "/audit", icon: Activity, roles: ["ADMINISTRADOR", "SUPERVISOR_EMPRESA", "ANALISTA_INTERNO"] },
];

const BOTTOM_ITEMS: NavItem[] = [
  { label: "Configuración", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar, unreadCount } = useUIStore();

  const handleLogout = async () => {
    await authService.logout();
    useAuthStore.getState().clearAuth();
    router.push("/login");
  };

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.roles) return true;
    if (!user) return false;
    return item.roles.includes(user.rol);
  });

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 72 : 260 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="relative flex flex-col h-screen bg-card border-r border-border overflow-hidden shrink-0 z-20"
      style={{ boxShadow: "4px 0 24px rgba(0,0,0,0.15)" }}
    >
      {/* ── Logo ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center h-16 px-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-blue shrink-0 shadow-glow-blue">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="min-w-0"
              >
                <p className="text-sm font-bold text-foreground truncate">BancoDDD</p>
                <p className="text-[10px] text-muted-foreground truncate">Enterprise Banking</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={toggleSidebar}
          className={cn(
            "ml-auto flex items-center justify-center w-7 h-7 rounded-lg",
            "text-muted-foreground hover:text-foreground hover:bg-secondary",
            "transition-colors duration-200 shrink-0"
          )}
          aria-label={sidebarCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* ── Navigation ───────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2 space-y-0.5">
        {visibleItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            isActive={isActive(item.href)}
            collapsed={sidebarCollapsed}
          />
        ))}

        <Separator className="my-3" />

        {BOTTOM_ITEMS.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            isActive={isActive(item.href)}
            collapsed={sidebarCollapsed}
          />
        ))}
      </nav>

      {/* ── User profile ─────────────────────────────────────────────────── */}
      <div className="border-t border-border p-3 shrink-0">
        <div
          className={cn(
            "flex items-center gap-3 rounded-xl p-2 transition-colors duration-200",
            "hover:bg-secondary cursor-pointer"
          )}
        >
          <div className="relative shrink-0">
            <Avatar className="w-9 h-9">
              <AvatarFallback className="text-xs">
                {user ? getInitials(user.nombreCompleto) : "?"}
              </AvatarFallback>
            </Avatar>
            {/* Online indicator */}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-card" />
          </div>

          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="flex-1 min-w-0"
              >
                <p className="text-sm font-medium text-foreground truncate">
                  {user?.nombreCompleto ?? "Usuario"}
                </p>
                {user && (
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-1.5 py-0 text-[10px] font-semibold",
                      getRoleColor(user.rol)
                    )}
                  >
                    {getRoleLabel(user.rol)}
                  </span>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleLogout}
                className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  );
}

// ── NavLink component ─────────────────────────────────────────────────────────

function NavLink({
  item,
  isActive,
  collapsed,
}: {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={cn(
        "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
        "transition-all duration-200 group",
        isActive
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      )}
    >
      {/* Active indicator */}
      {isActive && (
        <motion.span
          layoutId="activeNav"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full"
        />
      )}

      <Icon
        className={cn(
          "w-5 h-5 shrink-0 transition-colors",
          isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
        )}
      />

      <AnimatePresence>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.15 }}
            className="flex-1 truncate"
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>

      {!collapsed && item.badge && (
        <Badge variant="info" className="text-[10px] px-1.5 py-0 h-4">
          {item.badge}
        </Badge>
      )}
    </Link>
  );
}
