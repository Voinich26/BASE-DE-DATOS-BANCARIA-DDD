import { useState, useCallback, useRef } from "react";

/**
 * Hook para prevenir double-submit en formularios
 * Enterprise security feature para evitar envíos duplicados
 */
export function useAntiDoubleSubmit() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitIdRef = useRef<string | null>(null);

  const submit = useCallback(async <T,>(
    action: () => Promise<T>,
    options?: {
      onSuccess?: (result: T) => void;
      onError?: (error: Error) => void;
    }
  ): Promise<T | null> => {
    // Generar ID único para este submit
    const currentSubmitId = Math.random().toString(36).substring(7);
    submitIdRef.current = currentSubmitId;

    if (isSubmitting) {
      console.warn("Double-submit prevented");
      return null;
    }

    setIsSubmitting(true);

    try {
      const result = await action();

      // Verificar que este sea el submit actual
      if (submitIdRef.current === currentSubmitId) {
        options?.onSuccess?.(result);
      }

      return result;
    } catch (error) {
      if (submitIdRef.current === currentSubmitId) {
        options?.onError?.(error as Error);
      }
      throw error;
    } finally {
      // Solo limpiar si este es el submit actual
      if (submitIdRef.current === currentSubmitId) {
        setIsSubmitting(false);
        submitIdRef.current = null;
      }
    }
  }, [isSubmitting]);

  const reset = useCallback(() => {
    setIsSubmitting(false);
    submitIdRef.current = null;
  }, []);

  return {
    isSubmitting,
    submit,
    reset,
  };
}

/**
 * Hook para prevenir double-click en botones
 */
export function useAntiDoubleClick(delayMs: number = 1000) {
  const [isDisabled, setIsDisabled] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleClick = useCallback((callback: () => void) => {
    if (isDisabled) return;

    callback();

    setIsDisabled(true);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setIsDisabled(false);
    }, delayMs);
  }, [isDisabled, delayMs]);

  return {
    isDisabled,
    handleClick,
  };
}
