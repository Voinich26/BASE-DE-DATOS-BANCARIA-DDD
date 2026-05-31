"use client";

import { Button } from "@/components/ui/button";
import { ShieldAlert, Clock3, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Progress } from "@/components/ui/progress";

interface SessionTimeoutModalProps {
  open: boolean;
  remainingSeconds: number;
  onExtend: () => void;
  onLogout: () => void;
}

export function SessionTimeoutModal({
  open,
  remainingSeconds,
  onExtend,
  onLogout,
}: SessionTimeoutModalProps) {
  const totalSeconds = 60;
  const progressPercentage = ((totalSeconds - remainingSeconds) / totalSeconds) * 100;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="session-timeout-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-lg rounded-2xl border border-border bg-background p-8 shadow-2xl"
          >
            {/* Warning Icon */}
            <div className="flex items-center justify-center mb-6">
              <motion.div
                animate={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                className="h-16 w-16 rounded-full bg-orange-500/10 flex items-center justify-center"
              >
                <AlertTriangle className="h-8 w-8 text-orange-500" />
              </motion.div>
            </div>

            {/* Title */}
            <div className="text-center mb-6">
              <h2 id="session-timeout-title" className="text-2xl font-bold text-foreground mb-2">
                Sesión por expirar
              </h2>
              <p className="text-muted-foreground">
                Por seguridad, su sesión se cerrará automáticamente por inactividad.
              </p>
            </div>

            {/* Countdown Timer */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">Tiempo restante</span>
                <span className="text-2xl font-bold text-orange-500 font-mono">
                  {remainingSeconds}s
                </span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>

            {/* Security Message */}
            <div className="bg-secondary/50 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">
                    Protección de seguridad bancaria
                  </p>
                  <p>
                    Esta medida protege su cuenta contra accesos no autorizados en caso de que deje su dispositivo desatendido.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={onLogout} className="w-full sm:w-auto">
                Cerrar sesión ahora
              </Button>
              <Button onClick={onExtend} className="w-full sm:w-auto">
                Extender sesión
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
