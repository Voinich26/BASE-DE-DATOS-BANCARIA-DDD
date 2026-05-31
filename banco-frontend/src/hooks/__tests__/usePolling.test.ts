import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { usePolling } from "../usePolling";

describe("usePolling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should call fetch function on mount with immediate option", () => {
    const mockFetch = vi.fn();
    renderHook(() => usePolling(mockFetch, { immediate: true }));

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("should not call fetch function on mount without immediate option", () => {
    const mockFetch = vi.fn();
    renderHook(() => usePolling(mockFetch, { immediate: false }));

    expect(mockFetch).toHaveBeenCalledTimes(0);
  });

  it("should call fetch function at specified interval", () => {
    const mockFetch = vi.fn();
    renderHook(() => usePolling(mockFetch, { interval: 5000 }));

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("should not poll when enabled is false", () => {
    const mockFetch = vi.fn();
    renderHook(() => usePolling(mockFetch, { enabled: false, interval: 5000 }));

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(mockFetch).toHaveBeenCalledTimes(0);
  });

  it("should stop polling on unmount", () => {
    const mockFetch = vi.fn();
    const { unmount } = renderHook(() => usePolling(mockFetch, { interval: 5000 }));

    unmount();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(mockFetch).toHaveBeenCalledTimes(0);
  });

  it("should handle fetch errors gracefully", () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Fetch error"));
    renderHook(() => usePolling(mockFetch, { interval: 5000 }));

    expect(mockFetch).toHaveBeenCalledTimes(0);
  });

  it("should return start and stop functions", () => {
    const mockFetch = vi.fn();
    const { result } = renderHook(() => usePolling(mockFetch, { interval: 5000 }));

    expect(typeof result.current.start).toBe("function");
    expect(typeof result.current.stop).toBe("function");
  });

  it("should return metrics", () => {
    const mockFetch = vi.fn();
    const { result } = renderHook(() => usePolling(mockFetch, { interval: 5000 }));

    expect(result.current.metrics).toHaveProperty("totalPolls");
    expect(result.current.metrics).toHaveProperty("successfulPolls");
    expect(result.current.metrics).toHaveProperty("failedPolls");
    expect(result.current.metrics).toHaveProperty("lastPollTime");
    expect(result.current.metrics).toHaveProperty("isPolling");
  });
});
