"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  CreditCard,
  ArrowLeftRight,
  Landmark,
  FileStack,
  Users,
  Activity,
  Settings,
  BarChart3,
  Plus,
  LogOut,
  Moon,
  Sun,
  Command,
  ArrowRight,
  Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import { useUIStore } from "@/store/ui.store";
import { authService } from "@/services/auth.service";
import { trackCommandPalette } from "@/lib/analytics/client";

// ── Command definitions ───────────────────────────────────────────────────────

interface Command {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  shortcut?: string;
  category: "navigation" | "action" | "settings";
  roles?: string[];
  action: () => void;
}

// ── Store ─────────────────────────────────────────────────────────────────────

interface CommandPaletteStore {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

// Simple module-level state to avoid Zustand dependency
let _open = false;
const _listeners = new Set<(open: boolean) => void>();

export const commandPaletteStore: CommandPaletteStore = {
  get open() { return _open; },
  setOpen(open: boolean) {
    _open = open;
    _listeners.forEach((l) => l(open));
  },
  toggle() {
    commandPaletteStore.setOpen(!_open);
  },
};

function useCommandPaletteOpen() {
  const [open, setOpen] = useState(_open);
  useEffect(() => {
    _listeners.add(setOpen);
    return () => { _listeners.delete(setOpen); };
  }, []);
  return [open, (v: boolean) => commandPaletteStore.setOpen(v)] as const;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CommandPalette() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { theme, toggleTheme } = useUIStore();
  const [open, setOpen] = useCommandPaletteOpen();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // ── Commands list ──────────────────────────────────────────────────────────

  const commands: Command[] = [
    // Navigation
    { id: "nav-dashboard", label: "Dashboard", description: "Ir al dashboard principal", icon: LayoutDashboard, shortcut: "G D", category: "navigation", action: () => router.push("/dashboard") },
    { id: "nav-analytics", label: "Analytics", description: "Dashboard analítico avanzado", icon: BarChart3, shortcut: "G A", category: "navigation", action: () => router.push("/analytics") },
    { id: "nav-accounts", label: "Cuentas", description: "Gestión de cuentas bancarias", icon: CreditCard, shortcut: "G C", category: "navigation", action: () => router.push("/accounts") },
    { id: "nav-transfers", label: "Transferencias", description: "Historial de transferencias", icon: ArrowLeftRight, shortcut: "G T", category: "navigation", action: () => router.push("/transfers") },
    { id: "nav-loans", label: "Préstamos", description: "Solicitudes y aprobaciones", icon: Landmark, shortcut: "G P", category: "navigation", action: () => router.push("/loans") },
    { id: "nav-batches", label: "Pagos Masivos", description: "Lotes y nómina empresarial", icon: FileStack, shortcut: "G B", category: "navigation", action: () => router.push("/batches") },
    { id: "nav-users", label: "Usuarios", description: "Directorio de usuarios", icon: Users, category: "navigation", roles: ["ADMINISTRADOR", "SUPERVISOR_EMPRESA", "ANALISTA_INTERNO"], action: () => router.push("/users") },
    { id: "nav-audit", label: "Bitácora", description: "Registro de auditoría", icon: Activity, category: "navigation", roles: ["ADMINISTRADOR", "SUPERVISOR_EMPRESA", "ANALISTA_INTERNO"], action: () => router.push("/audit") },
    { id: "nav-settings", label: "Configuración", description: "Perfil y preferencias", icon: Settings, shortcut: "G S", category: "navigation", action: () => router.push("/settings") },
    // Actions
    { id: "action-new-transfer", label: "Nueva Transferencia", description: "Iniciar una transferencia bancaria", icon: Plus, shortcut: "N T", category: "action", action: () => router.push("/transfers/new") },
    { id: "action-new-loan", label: "Solicitar Préstamo", description: "Nueva solicitud de crédito", icon: Plus, category: "action", action: () => router.push("/loans/new") },
    // Settings
    { id: "settings-theme", label: theme === "dark" ? "Cambiar a Tema Claro" : "Cambiar a Tema Oscuro", description: "Alternar modo oscuro/claro", icon: theme === "dark" ? Sun : Moon, shortcut: "T T", category: "settings", action: toggleTheme },
    { id: "settings-logout", label: "Cerrar Sesión", description: "Salir de la plataforma", icon: LogOut, category: "settings", action: async () => { await authService.logout(); useAuthStore.getState().clearAuth(); router.push("/login"); } },
  ];

  // Filter by role
  const visibleCommands = commands.filter((cmd) => {
    if (!cmd.roles) return true;
    if (!user) return false;
    return cmd.roles.includes(user.rol);
  });

  // Filter by query
  const filtered = query.trim()
    ? visibleCommands.filter(
        (cmd) =>
          cmd.label.toLowerCase().includes(query.toLowerCase()) ||
          cmd.description?.toLowerCase().includes(query.toLowerCase())
      )
    : visibleCommands;

  // Group by category
  const grouped = {
    navigation: filtered.filter((c) => c.category === "navigation"),
    action: filtered.filter((c) => c.category === "action"),
    settings: filtered.filter((c) => c.category === "settings"),
  };

  const flatFiltered = [
    ...grouped.navigation,
    ...grouped.action,
    ...grouped.settings,
  ];

  // ── Keyboard navigation ────────────────────────────────────────────────────

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelectedIndex(0);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, flatFiltered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const cmd = flatFiltered[selectedIndex];
        if (cmd) {
          trackCommandPalette(cmd.id);
          cmd.action();
          setOpen(false);
        }
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    },
    [flatFiltered, selectedIndex, setOpen]
  );

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const CATEGORY_LABELS: Record<string, string> = {
    navigation: "Navegación",
    action: "Acciones Rápidas",
    settings: "Configuración",
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -16 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className={cn(
              "fixed left-1/2 top-[15%] z-50 -translate-x-1/2",
              "w-full max-w-xl mx-4",
              "bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
            )}
            role="dialog"
            aria-modal="true"
            aria-label="Paleta de comandos"
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Buscar comandos, páginas, acciones..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                aria-label="Buscar comandos"
                aria-autocomplete="list"
                aria-controls="command-list"
                aria-activedescendant={`cmd-${flatFiltered[selectedIndex]?.id}`}
              />
              <kbd className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono text-muted-foreground bg-secondary border border-border">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div
              ref={listRef}
              id="command-list"
              role="listbox"
              className="max-h-80 overflow-y-auto py-2"
            >
              {flatFiltered.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Hash className="w-6 h-6 opacity-30 mx-auto mb-2" />
                  <p className="text-sm">Sin resultados para "{query}"</p>
                </div>
              ) : (
                (["navigation", "action", "settings"] as const).map((cat) => {
                  const items = grouped[cat];
                  if (!items.length) return null;
                  return (
                    <div key={cat}>
                      <p className="px-4 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        {CATEGORY_LABELS[cat]}
                      </p>
                      {items.map((cmd) => {
                        const globalIndex = flatFiltered.indexOf(cmd);
                        const isSelected = globalIndex === selectedIndex;
                        const Icon = cmd.icon;
                        return (
                          <button
                            key={cmd.id}
                            id={`cmd-${cmd.id}`}
                            data-index={globalIndex}
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => {
                              trackCommandPalette(cmd.id);
                              cmd.action();
                              setOpen(false);
                            }}
                            onMouseEnter={() => setSelectedIndex(globalIndex)}
                            className={cn(
                              "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                              isSelected
                                ? "bg-primary/10 text-foreground"
                                : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                            )}
                          >
                            <div className={cn(
                              "flex items-center justify-center w-7 h-7 rounded-lg shrink-0",
                              isSelected ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
                            )}>
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{cmd.label}</p>
                              {cmd.description && (
                                <p className="text-xs text-muted-foreground truncate">{cmd.description}</p>
                              )}
                            </div>
                            {cmd.shortcut && (
                              <kbd className="hidden sm:flex items-center gap-0.5 shrink-0">
                                {cmd.shortcut.split(" ").map((k) => (
                                  <span key={k} className="px-1.5 py-0.5 rounded text-[10px] font-mono text-muted-foreground bg-secondary border border-border">
                                    {k}
                                  </span>
                                ))}
                              </kbd>
                            )}
                            {isSelected && (
                              <ArrowRight className="w-3.5 h-3.5 text-primary shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-secondary/30">
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded bg-secondary border border-border font-mono">↑↓</kbd>
                  Navegar
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded bg-secondary border border-border font-mono">↵</kbd>
                  Ejecutar
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Command className="w-3 h-3" />
                <span>K para abrir</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
