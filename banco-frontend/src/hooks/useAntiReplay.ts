import { useState, useCallback, useRef } from "react";

interface RequestMetadata {
  id: string;
  timestamp: number;
  endpoint: string;
  payload: string;
}

/**
 * Hook para prevenir ataques de replay
 * Enterprise security feature para evitar reenvío de solicitudes duplicadas
 */
export function useAntiReplay(maxAgeMs: number = 5000) {
  const [recentRequests, setRecentRequests] = useState<RequestMetadata[]>([]);
  const requestHistoryRef = useRef<Map<string, number>>(new Map());

  const generateRequestId = useCallback((endpoint: string, payload: any): string => {
    const payloadStr = typeof payload === "string" ? payload : JSON.stringify(payload);
    return `${endpoint}:${payloadStr}`;
  }, []);

  const isDuplicateRequest = useCallback((endpoint: string, payload: any): boolean => {
    const requestId = generateRequestId(endpoint, payload);
    const now = Date.now();
    const lastRequestTime = requestHistoryRef.current.get(requestId);

    if (lastRequestTime && (now - lastRequestTime) < maxAgeMs) {
      return true;
    }

    return false;
  }, [generateRequestId, maxAgeMs]);

  const recordRequest = useCallback((endpoint: string, payload: any): void => {
    const requestId = generateRequestId(endpoint, payload);
    const now = Date.now();

    requestHistoryRef.current.set(requestId, now);

    // Limpiar entradas antiguas
    const cutoff = now - maxAgeMs;
    for (const [id, timestamp] of requestHistoryRef.current.entries()) {
      if (timestamp < cutoff) {
        requestHistoryRef.current.delete(id);
      }
    }

    setRecentRequests(Array.from(requestHistoryRef.current.entries()).map(([id, timestamp]) => ({
      id,
      timestamp,
      endpoint: id.split(":")[0],
      payload: id.split(":").slice(1).join(":"),
    })));
  }, [generateRequestId, maxAgeMs]);

  const clearHistory = useCallback(() => {
    requestHistoryRef.current.clear();
    setRecentRequests([]);
  }, []);

  return {
    isDuplicateRequest,
    recordRequest,
    clearHistory,
    recentRequests,
  };
}

/**
 * Hook para generar nonce único para solicitudes
 */
export function useNonce() {
  const [nonce, setNonce] = useState<string>("");

  const generateNonce = useCallback((): string => {
    const newNonce = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    setNonce(newNonce);
    return newNonce;
  }, []);

  const resetNonce = useCallback(() => {
    setNonce("");
  }, []);

  return {
    nonce,
    generateNonce,
    resetNonce,
  };
}
