import { useEffect, useRef, useCallback, useState } from "react";

interface UsePollingOptions {
  /** Interval in milliseconds. Default: 30000 (30s) */
  interval?: number;
  /** Whether polling is enabled. Default: true */
  enabled?: boolean;
  /** Run immediately on mount. Default: true */
  immediate?: boolean;
  /** Number of retry attempts on failure. Default: 3 */
  retryCount?: number;
  /** Whether to pause when network is offline. Default: true */
  pauseOnOffline?: boolean;
  /** Callback for polling errors */
  onError?: (error: Error) => void;
  /** Callback for successful poll */
  onSuccess?: () => void;
}

interface PollingMetrics {
  totalPolls: number;
  successfulPolls: number;
  failedPolls: number;
  lastPollTime: Date | null;
  isPolling: boolean;
}

/**
 * Intelligent polling hook with visibility-aware pausing, retry logic, and metrics.
 * Pauses when the tab is hidden to save resources.
 * Automatically retries on failure and pauses when network is offline.
 */
export function usePolling(
  callback: () => void | Promise<void>,
  options: UsePollingOptions = {}
) {
  const {
    interval = 30000,
    enabled = true,
    immediate = false,
    retryCount = 3,
    pauseOnOffline = true,
    onError,
    onSuccess,
  } = options;
  
  const callbackRef = useRef(callback);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryCountRef = useRef(0);
  const [metrics, setMetrics] = useState<PollingMetrics>({
    totalPolls: 0,
    successfulPolls: 0,
    failedPolls: 0,
    lastPollTime: null,
    isPolling: false,
  });

  // Keep callback ref up to date
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const executeCallback = useCallback(async () => {
    if (!navigator.onLine && pauseOnOffline) {
      return;
    }

    setMetrics((prev) => ({ ...prev, isPolling: true }));

    try {
      await callbackRef.current();
      retryCountRef.current = 0;
      setMetrics((prev) => ({
        ...prev,
        totalPolls: prev.totalPolls + 1,
        successfulPolls: prev.successfulPolls + 1,
        lastPollTime: new Date(),
        isPolling: false,
      }));
      onSuccess?.();
    } catch (error) {
      retryCountRef.current += 1;
      setMetrics((prev) => ({
        ...prev,
        totalPolls: prev.totalPolls + 1,
        failedPolls: prev.failedPolls + 1,
        lastPollTime: new Date(),
        isPolling: false,
      }));
      
      if (retryCountRef.current <= retryCount) {
        // Retry with exponential backoff
        const backoffDelay = Math.min(1000 * Math.pow(2, retryCountRef.current - 1), 10000);
        setTimeout(() => executeCallback(), backoffDelay);
      } else {
        retryCountRef.current = 0;
        onError?.(error as Error);
      }
    }
  }, [pauseOnOffline, retryCount, onError, onSuccess]);

  const start = useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      if (document.visibilityState === "visible" && (!pauseOnOffline || navigator.onLine)) {
        executeCallback();
      }
    }, interval);
  }, [interval, pauseOnOffline, executeCallback]);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      stop();
      return;
    }

    if (immediate) {
      executeCallback();
    }

    start();

    // Pause when tab is hidden
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        stop();
      } else {
        start();
        executeCallback(); // Refresh immediately on tab focus
      }
    };

    // Pause when network goes offline
    const handleOnline = () => {
      if (enabled && document.visibilityState === "visible") {
        start();
        executeCallback();
      }
    };

    const handleOffline = () => {
      if (pauseOnOffline) {
        stop();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [enabled, immediate, start, stop, executeCallback, pauseOnOffline]);

  return { start, stop, metrics };
}
