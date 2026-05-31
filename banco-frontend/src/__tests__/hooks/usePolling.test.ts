import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePolling } from "@/hooks/usePolling";

describe("usePolling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not call callback immediately by default", () => {
    const callback = vi.fn();
    renderHook(() => usePolling(callback, { interval: 1000 }));
    expect(callback).not.toHaveBeenCalled();
  });

  it("calls callback immediately when immediate=true", () => {
    const callback = vi.fn();
    renderHook(() => usePolling(callback, { interval: 1000, immediate: true }));
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("calls callback after interval", () => {
    const callback = vi.fn();
    renderHook(() => usePolling(callback, { interval: 1000 }));

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("calls callback multiple times", () => {
    const callback = vi.fn();
    renderHook(() => usePolling(callback, { interval: 1000 }));

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(callback).toHaveBeenCalledTimes(3);
  });

  it("does not call callback when disabled", () => {
    const callback = vi.fn();
    renderHook(() => usePolling(callback, { interval: 1000, enabled: false }));

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it("cleans up interval on unmount", () => {
    const callback = vi.fn();
    const { unmount } = renderHook(() =>
      usePolling(callback, { interval: 1000 })
    );

    unmount();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(callback).not.toHaveBeenCalled();
  });
});
