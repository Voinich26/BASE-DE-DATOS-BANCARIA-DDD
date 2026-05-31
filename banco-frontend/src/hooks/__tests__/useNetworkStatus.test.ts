import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useNetworkStatus } from "../useNetworkStatus";

describe("useNetworkStatus", () => {
  beforeEach(() => {
    // Reset navigator.onLine
    Object.defineProperty(navigator, "onLine", {
      writable: true,
      value: true,
    });
  });

  it("should initialize with online status when navigator is online", () => {
    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.status).toBe("online");
  });

  it("should initialize with offline status when navigator is offline", () => {
    Object.defineProperty(navigator, "onLine", {
      writable: true,
      value: false,
    });

    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.status).toBe("offline");
  });

  it("should update status when connection changes", () => {
    const { result } = renderHook(() => useNetworkStatus());

    act(() => {
      window.dispatchEvent(new Event("offline"));
    });

    expect(result.current.status).toBe("offline");

    act(() => {
      window.dispatchEvent(new Event("online"));
    });

    expect(result.current.status).toBe("online");
  });

  it("should track offline duration", () => {
    const { result } = renderHook(() => useNetworkStatus());

    act(() => {
      window.dispatchEvent(new Event("offline"));
    });

    expect(result.current.offlineDuration).toBeTruthy();
    expect(typeof result.current.offlineDuration).toBe("string");
  });

  it("should provide reconnect function", () => {
    const { result } = renderHook(() => useNetworkStatus());

    expect(typeof result.current.reconnect).toBe("function");
  });

  it("should track reconnect attempts", () => {
    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.reconnectAttempts).toBe(0);
  });
});
