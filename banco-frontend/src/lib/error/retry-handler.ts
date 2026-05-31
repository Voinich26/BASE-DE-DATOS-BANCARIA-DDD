import { parseApiError, type ParsedApiError } from "./parser";

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  onRetry?: (attempt: number, error: ParsedApiError) => void;
  shouldRetry?: (error: ParsedApiError) => boolean;
}

export interface RetryResult<T> {
  data: T;
  attempts: number;
  totalDelay: number;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  onRetry: () => {},
  shouldRetry: (error) => error.retryable,
};

/**
 * Retry handler with exponential backoff for enterprise-grade resilience
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: ParsedApiError | null = null;
  let totalDelay = 0;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      const data = await fn();
      return {
        data,
        attempts: attempt + 1,
        totalDelay,
      };
    } catch (error) {
      const parsedError = parseApiError(error);
      lastError = parsedError;

      // Don't retry on last attempt or if error is not retryable
      if (attempt === opts.maxRetries || !opts.shouldRetry(parsedError)) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        opts.initialDelay * Math.pow(opts.backoffMultiplier, attempt),
        opts.maxDelay
      );
      totalDelay += delay;

      // Notify retry attempt
      opts.onRetry(attempt + 1, parsedError);

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError;
}

/**
 * Check if an operation should be retried based on error type
 */
export function shouldRetryError(error: ParsedApiError): boolean {
  // Retry on network errors, timeouts, server errors, and rate limiting
  return (
    error.isNetworkError ||
    error.isTimeout ||
    error.isServerError ||
    error.isTooManyRequests
  );
}

/**
 * Calculate delay with jitter to avoid thundering herd
 */
export function calculateDelayWithJitter(
  attempt: number,
  baseDelay: number,
  maxDelay: number,
  jitter: number = 0.1
): number {
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const jitterAmount = exponentialDelay * jitter;
  const randomJitter = Math.random() * jitterAmount - jitterAmount / 2;
  return Math.min(Math.max(exponentialDelay + randomJitter, 0), maxDelay);
}

/**
 * Create a debounced retry function
 */
export function createDebouncedRetry<T>(
  fn: () => Promise<T>,
  debounceMs: number = 500
): () => Promise<RetryResult<T>> {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastPromise: Promise<RetryResult<T>> | null = null;

  return () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    return new Promise((resolve, reject) => {
      timeoutId = setTimeout(async () => {
        try {
          const result = await withRetry(fn);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, debounceMs);
    });
  };
}
