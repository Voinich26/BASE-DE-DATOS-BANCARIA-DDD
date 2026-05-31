"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth.service";
import { tokenStorage } from "@/services/api";
import { useAuthStore } from "@/store/auth.store";
import { SessionTimeoutModal } from "@/components/shared/SessionTimeoutModal";
import { logInfo } from "@/lib/logger/client";

const INACTIVITY_TIMEOUT_SECONDS = 15 * 60;
const WARNING_THRESHOLD_SECONDS = 60;
const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "visibilitychange",
  "scroll",
];

export function SessionTimeoutProvider() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const [remainingSeconds, setRemainingSeconds] = useState(INACTIVITY_TIMEOUT_SECONDS);
  const [warningVisible, setWarningVisible] = useState(false);
  const lastActivityRef = useRef(Date.now());
  const intervalRef = useRef<number | null>(null);

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    setWarningVisible(false);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // ignore logout failure, proceed with cleanup
    }
    tokenStorage.clearTokens();
    clearAuth();
    router.replace("/login");
  }, [clearAuth, router]);

  const extendSession = useCallback(async () => {
    resetTimer();
    setRemainingSeconds(INACTIVITY_TIMEOUT_SECONDS);
    try {
      await authService.refresh();
      logInfo("session", "Sesión extendida por inactividad");
    } catch (error) {
      logInfo("session", "No se pudo extender la sesión", { error });
      await logout();
    }
  }, [logout, resetTimer]);

  useEffect(() => {
    if (!isAuthenticated) {
      setRemainingSeconds(INACTIVITY_TIMEOUT_SECONDS);
      setWarningVisible(false);
      return;
    }

    resetTimer();

    const handleActivity = () => {
      if (document.visibilityState === "hidden") return;
      resetTimer();
    };

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity, { passive: true });
    });

    intervalRef.current = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastActivityRef.current) / 1000);
      const remaining = Math.max(0, INACTIVITY_TIMEOUT_SECONDS - elapsed);
      setRemainingSeconds(remaining);

      if (remaining > WARNING_THRESHOLD_SECONDS) {
        setWarningVisible(false);
      }

      if (remaining <= WARNING_THRESHOLD_SECONDS && remaining > 0) {
        setWarningVisible(true);
      }

      if (remaining === 0) {
        logInfo("session", "Sesión cerrada por inactividad");
        void logout();
      }
    }, 1000);

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity);
      });
    };
  }, [isAuthenticated, logout, resetTimer]);

  if (!isAuthenticated) return null;

  return (
    <SessionTimeoutModal
      open={warningVisible}
      remainingSeconds={remainingSeconds}
      onExtend={extendSession}
      onLogout={logout}
    />
  );
}
