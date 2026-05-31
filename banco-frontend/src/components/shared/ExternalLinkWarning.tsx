"use client";

import { useState } from "react";
import { ExternalLink, AlertTriangle, ShieldAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExternalLinkWarningProps {
  href: string;
  children: React.ReactNode;
  warningMessage?: string;
}

/**
 * Componente para proteger la navegación externa con warnings
 * Enterprise security feature para prevenir phishing
 */
export function ExternalLinkWarning({
  href,
  children,
  warningMessage,
}: ExternalLinkWarningProps) {
  const [isOpen, setIsOpen] = useState(false);

  const isExternal = href.startsWith("http://") || href.startsWith("https://");
  const isSameOrigin = typeof window !== "undefined" && href.startsWith(window.location.origin);

  if (!isExternal || isSameOrigin) {
    return <a href={href}>{children}</a>;
  }

  const handleConfirm = () => {
    window.open(href, "_blank", "noopener,noreferrer");
    setIsOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1 text-primary hover:underline"
      >
        {children}
        <ExternalLink className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <ShieldAlert className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Navegación externa</h3>
                  <p className="text-sm text-muted-foreground">
                    Está a punto de salir del entorno seguro del banco.
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="bg-secondary/50 rounded-lg p-4 my-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm space-y-2">
                  <p className="font-medium text-foreground">Advertencia de seguridad</p>
                  <p className="text-muted-foreground">
                    {warningMessage || "Este enlace lo llevará a un sitio externo. Verifique que es un sitio confiable antes de continuar."}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono bg-background p-2 rounded break-all">
                    {href}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setIsOpen(false)} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button onClick={handleConfirm} className="w-full sm:w-auto">
                Continuar a sitio externo
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Hook para detectar enlaces externos
 */
export function useExternalLink(href: string) {
  const isExternal = href.startsWith("http://") || href.startsWith("https://");
  const isSameOrigin = typeof window !== "undefined" && href.startsWith(window.location.origin);

  return {
    isExternal: isExternal && !isSameOrigin,
    isSafe: !isExternal || isSameOrigin,
  };
}
