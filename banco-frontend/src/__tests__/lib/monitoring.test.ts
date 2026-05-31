import { describe, it, expect, beforeEach } from "vitest";
import {
  logMetric,
  trackApiRequest,
  trackApiError,
  trackError,
  getMetricsBuffer,
  clearMetricsBuffer,
} from "@/lib/monitoring/client";

describe("monitoring client", () => {
  beforeEach(() => {
    clearMetricsBuffer();
  });

  it("logs a metric to the buffer", () => {
    logMetric("api_request", { url: "/test", durationMs: 100 });
    const buffer = getMetricsBuffer();
    expect(buffer).toHaveLength(1);
    expect(buffer[0].name).toBe("api_request");
  });

  it("trackApiRequest adds entry with correct shape", () => {
    trackApiRequest("GET", "/v1/accounts", 150, 200);
    const buffer = getMetricsBuffer();
    expect(buffer[0].name).toBe("api_request");
    const val = buffer[0].value as Record<string, unknown>;
    expect(val.method).toBe("GET");
    expect(val.status).toBe(200);
    expect(val.durationMs).toBe(150);
  });

  it("trackApiError adds error entry", () => {
    trackApiError("POST", "/v1/transfers", 422, "Saldo insuficiente");
    const buffer = getMetricsBuffer();
    expect(buffer[0].name).toBe("api_error");
    const val = buffer[0].value as Record<string, unknown>;
    expect(val.status).toBe(422);
  });

  it("trackError captures error message", () => {
    trackError(new Error("Test error"), { module: "test" });
    const buffer = getMetricsBuffer();
    expect(buffer[0].name).toBe("error");
    const val = buffer[0].value as Record<string, unknown>;
    expect(val.message).toBe("Test error");
  });

  it("clears buffer", () => {
    logMetric("api_request", 100);
    logMetric("api_request", 200);
    clearMetricsBuffer();
    expect(getMetricsBuffer()).toHaveLength(0);
  });

  it("caps buffer at 200 entries", () => {
    for (let i = 0; i < 250; i++) {
      logMetric("api_request", i);
    }
    expect(getMetricsBuffer().length).toBeLessThanOrEqual(200);
  });
});
