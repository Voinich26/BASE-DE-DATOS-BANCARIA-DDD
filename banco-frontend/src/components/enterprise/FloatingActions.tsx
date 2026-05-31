"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Plus,
  ArrowLeftRight,
  Landmark,
  FileStack,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";

interface FloatingAction {
  label: string;
  icon: React.ElementType;
  href: string;
  color: string;
}

const ACTIONS: FloatingAction[] = [
  {
    label: "Nueva Transferencia",
    icon: ArrowLeftRight,
    href: "/transfers/new",
    color: "bg-blue-600 hover:bg-blue-500",
  },
  {
    label: "Solicitar Préstamo",
    icon: Landmark,
    href: "/loans/new",
    color: "bg-purple-600 hover:bg-purple-500",
  },
  {
    label: "Nuevo Lote",
    icon: FileStack,
    href: "/batches",
    color: "bg-emerald-600 hover:bg-emerald-500",
  },
];

export function FloatingActions() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [open, setOpen] = useState(false);

  if (!isAuthenticated) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3"
      aria-label="Acciones rápidas"
    >
      {/* Action items */}
      <AnimatePresence>
        {open &&
          ACTIONS.map((action, i) => {
            const Icon = action.icon;
            return (
              <motion.button
                key={action.href}
                initial={{ opacity: 0, scale: 0.8, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 16 }}
                transition={{ delay: i * 0.05, duration: 0.2 }}
                onClick={() => {
                  router.push(action.href);
                  setOpen(false);
                }}
                className={cn(
                  "flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-white text-sm font-medium shadow-lg",
                  "transition-all duration-200 active:scale-95",
                  action.color
                )}
                aria-label={action.label}
              >
                <Icon className="w-4 h-4" />
                <span>{action.label}</span>
              </motion.button>
            );
          })}
      </AnimatePresence>

      {/* Main FAB */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center justify-center w-14 h-14 rounded-2xl shadow-xl",
          "bg-gradient-to-br from-blue-600 to-blue-700 text-white",
          "transition-all duration-300",
          open && "rotate-45"
        )}
        aria-label={open ? "Cerrar acciones rápidas" : "Abrir acciones rápidas"}
        aria-expanded={open}
      >
        <motion.div
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          {open ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
        </motion.div>
      </motion.button>
    </div>
  );
}
