"use client";

import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

export function OfflineBanner() {
  const { status, reconnect, offlineDuration } = useNetworkStatus();

  return (
    <AnimatePresence>
      {status !== "online" ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="fixed inset-x-0 top-0 z-50 mx-auto flex max-w-5xl flex-col gap-3 rounded-b-3xl bg-slate-950/95 px-4 py-4 text-sm text-slate-100 shadow-2xl shadow-slate-950/20 sm:flex-row sm:items-center sm:justify-between"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-2">
            {status === "offline" ? (
              <WifiOff className="h-4 w-4 text-yellow-300" aria-hidden="true" />
            ) : (
              <Wifi className="h-4 w-4 text-emerald-300" aria-hidden="true" />
            )}
            <div className="space-y-1">
              <p className="font-semibold text-white">
                {status === "offline" ? "Conexión perdida" : "Reconectando..."}
              </p>
              <p className="text-xs text-slate-300">
                {status === "offline"
                  ? "Su conexión no está disponible. Algunas funciones quedan en modo offline."
                  : "Restaurando sincronización con la red bancaria..."}
                {offlineDuration ? ` (${offlineDuration})` : ""}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              variant="secondary"
              size="sm"
              onClick={reconnect}
              className="inline-flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Reconectar
            </Button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
