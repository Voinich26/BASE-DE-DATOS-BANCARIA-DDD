"use client";

import { useState } from "react";
import { WifiOff, RefreshCw, ShieldAlert, Clock, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

export default function OfflinePage() {
  const { status, reconnect } = useNetworkStatus();
  const [isReconnecting, setIsReconnecting] = useState(false);

  const handleReconnect = async () => {
    setIsReconnecting(true);
    await reconnect();
    setIsReconnecting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-orange-500/10 mb-4">
            <WifiOff className="h-10 w-10 text-orange-500" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Sin conexión
          </h1>
          <p className="text-muted-foreground">
            BancoDDD está funcionando en modo offline
          </p>
        </div>

        {/* Status Card */}
        <Card className="p-6 mb-6 border-orange-500/20 bg-orange-500/5">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <ShieldAlert className="h-6 w-6 text-orange-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-2">
                Modo offline activado
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Algunos servicios bancarios están limitados mientras no tenga conexión a internet.
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Las operaciones pendientes se sincronizarán al reconectar
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Puede consultar datos cacheados anteriormente
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Available Features */}
        <Card className="p-6 mb-6">
          <h3 className="font-semibold text-foreground mb-4">
            Funciones disponibles offline
          </h3>
          <ul className="space-y-3">
            <li className="flex items-center gap-3 text-sm">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-muted-foreground">Ver datos cacheados del dashboard</span>
            </li>
            <li className="flex items-center gap-3 text-sm">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-muted-foreground">Consultar historial de transferencias</span>
            </li>
            <li className="flex items-center gap-3 text-sm">
              <div className="h-2 w-2 rounded-full bg-orange-500" />
              <span className="text-muted-foreground">Nuevas operaciones en cola</span>
            </li>
            <li className="flex items-center gap-3 text-sm">
              <div className="h-2 w-2 rounded-full bg-red-500" />
              <span className="text-muted-foreground">Transferencias en tiempo real no disponibles</span>
            </li>
          </ul>
        </Card>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={handleReconnect}
            disabled={isReconnecting}
            className="w-full"
            size="lg"
          >
            {isReconnecting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Reconectando...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Intentar reconectar
              </>
            )}
          </Button>
          <Button
            variant="outline"
            className="w-full"
            size="lg"
            onClick={() => window.location.href = "/"}
          >
            Ir al inicio
          </Button>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          BancoDDD - Seguridad bancaria enterprise
        </p>
      </div>
    </div>
  );
}
