"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { logInfo } from "@/lib/logger/client";

export function ServiceWorkerProvider() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    let registration: ServiceWorkerRegistration | null = null;

    const handleWaiting = () => {
      setUpdateAvailable(true);
      toast.info("Nueva versión disponible. Actualice para ver las últimas mejoras.");
    };

    const registerServiceWorker = async () => {
      try {
        registration = await navigator.serviceWorker.register("/sw.js");
        logInfo("service-worker", "Service worker registrado", {
          scope: registration.scope,
        });

        if (registration.waiting) {
          handleWaiting();
        }

        registration.addEventListener("updatefound", () => {
          const newWorker = registration?.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                handleWaiting();
              }
            });
          }
        });
      } catch (error) {
        logInfo("service-worker", "No se pudo registrar el service worker", {
          error,
        });
      }
    };

    registerServiceWorker();

    return () => {
      registration = null;
    };
  }, []);

  const reloadApp = () => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg?.waiting) {
        window.location.reload();
        return;
      }

      reg.waiting.postMessage({ type: "SKIP_WAITING" });
      reg.waiting.addEventListener("statechange", (event) => {
        if ((event.target as ServiceWorker).state === "activated") {
          window.location.reload();
        }
      });
    });
  };

  return updateAvailable ? (
    <button
      type="button"
      onClick={reloadApp}
      className="fixed bottom-4 right-4 z-50 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-background shadow-2xl shadow-primary/30 transition hover:bg-primary/90"
    >
      Actualizar aplicación
    </button>
  ) : null;
}
