/**
 * Enterprise frontend logger.
 * Levels: debug < info < warn < error
 * In production, errors are also sent to the monitoring buffer.
 */

import { trackError } from "@/lib/monitoring/client";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  level: LogLevel;
  module: string;
  message: string;
  data?: unknown;
  timestamp: string;
}

// ── Config ────────────────────────────────────────────────────────────────────

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const MIN_LEVEL: LogLevel =
  process.env.NODE_ENV === "production" ? "warn" : "debug";

// ── In-memory log buffer ──────────────────────────────────────────────────────

const LOG_BUFFER_MAX = 300;
const logBuffer: LogEntry[] = [];

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[MIN_LEVEL];
}

function writeLog(
  level: LogLevel,
  module: string,
  message: string,
  data?: unknown
): void {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    level,
    module,
    message,
    data,
    timestamp: new Date().toISOString(),
  };

  logBuffer.push(entry);
  if (logBuffer.length > LOG_BUFFER_MAX) {
    logBuffer.shift();
  }

  const prefix = `[${entry.timestamp}] [${level.toUpperCase()}] [${module}]`;

  switch (level) {
    case "debug":
      console.debug(prefix, message, data ?? "");
      break;
    case "info":
      console.info(prefix, message, data ?? "");
      break;
    case "warn":
      console.warn(prefix, message, data ?? "");
      break;
    case "error":
      console.error(prefix, message, data ?? "");
      // Forward errors to monitoring
      if (data instanceof Error) {
        trackError(data, { module, message });
      } else {
        trackError(new Error(message), { module, data });
      }
      break;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export const logDebug = (module: string, message: string, data?: unknown) =>
  writeLog("debug", module, message, data);

export const logInfo = (module: string, message: string, data?: unknown) =>
  writeLog("info", module, message, data);

export const logWarn = (module: string, message: string, data?: unknown) =>
  writeLog("warn", module, message, data);

export const logError = (module: string, message: string, data?: unknown) =>
  writeLog("error", module, message, data);

export const getLogBuffer = (): LogEntry[] => [...logBuffer];

export const clearLogBuffer = (): void => {
  logBuffer.length = 0;
};
