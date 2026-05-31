import { useEffect, useState } from "react";

/**
 * Hook para aplicar blur automático cuando la tab está oculta
 * Enterprise security feature para proteger datos sensibles
 */
export function useAutoBlur(enabled: boolean = true) {
  const [isBlurred, setIsBlurred] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      setIsBlurred(document.visibilityState === "hidden");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled]);

  return { isBlurred };
}
