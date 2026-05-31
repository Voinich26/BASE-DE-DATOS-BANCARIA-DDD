"use client";

import { useEffect, useState } from "react";

// Extender ServiceWorkerRegistration para incluir Background Sync API
declare global {
  interface ServiceWorkerRegistration {
    sync?: {
      register(tag: string): Promise<void>;
    };
  }
}

/**
 * Hook para manejar background sync
 * Enterprise feature para sincronización de operaciones offline
 */
export function useBackgroundSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [pendingOperations, setPendingOperations] = useState<number>(0);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "BACKGROUND_SYNC") {
        setIsSyncing(true);
        setTimeout(() => {
          setIsSyncing(false);
          setLastSync(new Date());
        }, 2000);
      }
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);

    return () => {
      navigator.serviceWorker.removeEventListener("message", handleMessage);
    };
  }, []);

  const registerSync = async (tag: string = "sync-pending-transfers") => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      if (registration.sync) {
        await registration.sync.register(tag);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Background sync registration failed:", error);
      return false;
    }
  };

  return {
    isSyncing,
    lastSync,
    pendingOperations,
    registerSync,
  };
}
