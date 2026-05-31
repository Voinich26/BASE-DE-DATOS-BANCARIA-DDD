import { useState, useCallback } from "react";

/**
 * Hook para manejar el clipboard de forma segura
 * Enterprise security feature para datos sensibles
 */
export function useSecureClipboard() {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copyToClipboard = useCallback(async (text: string, options?: {
    sensitive?: boolean;
    timeout?: number;
  }): Promise<boolean> => {
    setError(null);

    try {
      // Verificar si el navegador soporta clipboard API
      if (!navigator.clipboard) {
        throw new Error("Clipboard API no soportada");
      }

      // Para datos sensibles, agregar un timestamp para rastreo
      const dataToCopy = options?.sensitive 
        ? `${text} [COPIADO: ${new Date().toISOString()}]`
        : text;

      await navigator.clipboard.writeText(dataToCopy);

      setCopied(true);

      // Resetear estado después del timeout
      const timeout = options?.timeout ?? 2000;
      setTimeout(() => {
        setCopied(false);
      }, timeout);

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al copiar";
      setError(errorMessage);
      console.error("Secure clipboard error:", err);
      return false;
    }
  }, []);

  const clearClipboard = useCallback(async (): Promise<boolean> => {
    try {
      if (!navigator.clipboard) {
        throw new Error("Clipboard API no soportada");
      }

      await navigator.clipboard.writeText("");
      setCopied(false);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al limpiar clipboard";
      setError(errorMessage);
      return false;
    }
  }, []);

  const readFromClipboard = useCallback(async (): Promise<string | null> => {
    try {
      if (!navigator.clipboard) {
        throw new Error("Clipboard API no soportada");
      }

      const text = await navigator.clipboard.readText();
      return text;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al leer clipboard";
      setError(errorMessage);
      return null;
    }
  }, []);

  return {
    copied,
    error,
    copyToClipboard,
    clearClipboard,
    readFromClipboard,
  };
}
