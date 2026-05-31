"use client";

import { useRouter } from "next/navigation";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface ErrorFallbackProps {
  error: Error;
  reset?: () => void;
  context?: string;
}

export function ErrorFallback({ error, reset, context }: ErrorFallbackProps) {
  const router = useRouter();

  const handleRecover = () => {
    if (reset) {
      reset();
      return;
    }
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl rounded-3xl border border-border bg-secondary/95 p-10 shadow-2xl"
        role="alert"
        aria-live="assertive"
      >
        <div className="flex items-center gap-3 text-destructive">
          <AlertTriangle className="w-6 h-6" aria-hidden="true" />
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-destructive/80">Error crítico</p>
            <h1 className="mt-2 text-2xl font-bold text-foreground">Algo salió mal</h1>
          </div>
        </div>

        <p className="mt-6 text-sm leading-6 text-muted-foreground">
          {context ? `Error en ${context}.` : "Se ha producido un error inesperado."}
        </p>
        <pre className="mt-4 max-h-40 overflow-auto rounded-2xl bg-slate-950/5 p-4 text-xs text-foreground/80">
          {error?.message}
        </pre>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <Button
            variant="secondary"
            onClick={() => router.push("/")}
            className="w-full sm:w-auto"
          >
            Ir al inicio
          </Button>
          <Button onClick={handleRecover} className="w-full sm:w-auto">
            <RefreshCcw className="mr-2 h-4 w-4" />
            Reintentar
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
