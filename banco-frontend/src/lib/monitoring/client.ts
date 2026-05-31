/**
 * Frontend monitoring client — tracks performance metrics, errors and vitals.
 * In production this would ship to a real APM (Datadog, New Relic, etc.).
 * For now it stores in memory and logs to console in dev.
 */

export type MetricName =
  | "navigation"
  | "api_request"
  | "api_error"
  | "render_time"
  | "interaction"
  | "web_vital"
  | "error";

export interface Metric {
  name: MetricName;
  value: number | Record<string, unknown>;
  timestamp: number;
  sessionId: string;
  url: string;
  tags?: Record<string, string>;
}

// ── In-memory buffer (max 200 entries) ───────────────────────────────────────

const BUFFER_MAX = 200;
const metricsBuffer: Metric[] = [];

function getSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = sessionStorage.getItem("banco_session_id");
  if (!id) {
    id = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem("banco_session_id", id);
  }
  return id;
}

// ── Core log function ─────────────────────────────────────────────────────────

export function logMetric(
  name: MetricName,
  value: number | Record<string, unknown>,
  tags?: Record<string, string>
): void {
  if (typeof window === "undefined") return;

  const metric: Metric = {
    name,
    value,
    timestamp: Date.now(),
    sessionId: getSessionId(),
    url: window.location.pathname,
    tags,
  };

  metricsBuffer.push(metric);
  if (metricsBuffer.length > BUFFER_MAX) {
    metricsBuffer.shift();
  }

  if (process.env.NODE_ENV === "development") {
    console.debug(`[Monitor] ${name}`, value, tags ?? "");
  }
}

// ── API request tracking ──────────────────────────────────────────────────────

export function trackApiRequest(
  method: string,
  url: string,
  durationMs: number,
  status: number
): void {
  logMetric("api_request", { method, url, durationMs, status }, {
    method,
    status: String(status),
  });
}

export function trackApiError(
  method: string,
  url: string,
  status: number,
  message: string
): void {
  logMetric("api_error", { method, url, status, message }, {
    method,
    status: String(status),
  });
}

// ── Web Vitals ────────────────────────────────────────────────────────────────

export function trackWebVital(name: string, value: number): void {
  logMetric("web_vital", { name, value }, { vital: name });
}

// ── Error tracking ────────────────────────────────────────────────────────────

export function trackError(
  error: Error,
  context?: Record<string, unknown>
): void {
  logMetric("error", {
    message: error.message,
    stack: error.stack?.slice(0, 500),
    ...context,
  });
}

// ── Retrieve buffer (for debug panel) ────────────────────────────────────────

export function getMetricsBuffer(): Metric[] {
  return [...metricsBuffer];
}

export function clearMetricsBuffer(): void {
  metricsBuffer.length = 0;
}
