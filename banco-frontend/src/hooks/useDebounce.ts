import { useState, useEffect } from "react";

/**
 * Debounces a value by the given delay (ms).
 * Useful for search inputs to avoid firing a query on every keystroke.
 */
export function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
