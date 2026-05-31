"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { toast } from "sonner";

export type NetworkStatus = "online" | "offline" | "reconnecting";

export function useNetworkStatus(autoReconnect: boolean = true) {
  const [status, setStatus] = useState<NetworkStatus>("online");
  const [lastOfflineAt, setLastOfflineAt] = useState<Date | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 3;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = async () => {
      setStatus("reconnecting");
      
      if (autoReconnect) {
        // Intentar reconectar automáticamente
        for (let i = 0; i < maxReconnectAttempts; i++) {
          try {
            // Verificar conexión haciendo una petición a la API
            const response = await fetch("/api/health", { 
              method: "HEAD",
              cache: "no-cache"
            });
            
            if (response.ok) {
              setStatus("online");
              reconnectAttemptsRef.current = 0;
              toast.success("Conexión restaurada", {
                description: "La aplicación bancaria se ha sincronizado correctamente.",
              });
              return;
            }
          } catch {
            // Continuar intentando
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        // Si falla después de todos los intentos
        setStatus("offline");
        toast.error("Error de conexión", {
          description: "No se pudo restablecer la conexión automáticamente.",
        });
      } else {
        // Sin reconexión automática, solo cambiar estado
        setTimeout(() => {
          setStatus("online");
          toast.success("Conexión restaurada", {
            description: "La aplicación bancaria se ha sincronizado correctamente.",
          });
        }, 500);
      }
    };

    const handleOffline = () => {
      setStatus("offline");
      setLastOfflineAt(new Date());
      toast.warning("Modo offline activado", {
        description: "Algunas funciones pueden no estar disponibles hasta recuperar conexión.",
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if (!navigator.onLine) {
      handleOffline();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [autoReconnect]);

  const reconnect = async () => {
    if (typeof window === "undefined") return;
    
    if (!navigator.onLine) {
      toast.error("No hay conexión", {
        description: "Vuelva a intentar cuando esté conectado a la red.",
      });
      return;
    }

    setStatus("reconnecting");
    reconnectAttemptsRef.current++;

    try {
      // Verificar conexión
      const response = await fetch("/api/health", { 
        method: "HEAD",
        cache: "no-cache"
      });
      
      if (response.ok) {
        setStatus("online");
        reconnectAttemptsRef.current = 0;
        toast.success("Conexión restaurada", {
          description: "La aplicación bancaria se ha sincronizado correctamente.",
        });
        window.location.reload();
      } else {
        throw new Error("Health check failed");
      }
    } catch {
      setStatus("offline");
      toast.error("Error de conexión", {
        description: "No se pudo restablecer la conexión. Intente nuevamente.",
      });
    }
  };

  const offlineDuration = useMemo(() => {
    if (!lastOfflineAt) return null;
    const seconds = Math.floor((Date.now() - lastOfflineAt.getTime()) / 1000);
    return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m`;
  }, [lastOfflineAt]);

  return { status, reconnect, offlineDuration, reconnectAttempts: reconnectAttemptsRef.current };
}
