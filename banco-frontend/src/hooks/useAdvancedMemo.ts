import { useMemo, useCallback, useRef } from "react";

/**
 * Hook de memoización avanzada con cache LRU
 * Enterprise performance feature para optimizar cálculos costosos
 */
export function useAdvancedMemo<T>(
  factory: () => T,
  deps: any[],
  maxSize: number = 10
): T {
  const cacheRef = useRef<Map<string, T>>(new Map());
  const key = JSON.stringify(deps);

  return useMemo(() => {
    const cache = cacheRef.current;
    
    // Verificar si key es válido
    if (!key) {
      return factory();
    }
    
    // Verificar si está en cache
    if (cache.has(key)) {
      return cache.get(key)!;
    }

    // Calcular valor
    const value = factory();

    // Agregar a cache con LRU
    if (cache.size >= maxSize) {
      const firstKey = cache.keys().next().value;
      if (firstKey) {
        cache.delete(firstKey);
      }
    }
    cache.set(key, value);

    return value;
  }, [key, factory, maxSize]);
}

/**
 * Hook para memoizar callbacks con debounce
 * Enterprise performance feature para evitar llamadas excesivas
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    }) as T,
    [callback, delay]
  );
}

/**
 * Hook para memoizar callbacks con throttle
 * Enterprise performance feature para limitar frecuencia de llamadas
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
): T {
  const lastCallRef = useRef<number>(0);

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCallRef.current >= delay) {
        lastCallRef.current = now;
        callback(...args);
      }
    }) as T,
    [callback, delay]
  );
}
