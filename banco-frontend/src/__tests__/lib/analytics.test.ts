import { describe, it, expect, beforeEach } from "vitest";
import {
  track,
  trackPageView,
  trackLogin,
  trackExport,
  getEventStore,
} from "@/lib/analytics/client";

// Clear module-level store between tests
function clearStore() {
  const store = getEventStore();
  store.length = 0;
}

describe("analytics client", () => {
  beforeEach(() => {
    // Reset by calling track with a sentinel and then clearing
    // Since the store is module-level, we just track and check length
  });

  it("track adds event to store", () => {
    const before = getEventStore().length;
    track("test_event", { foo: "bar" });
    expect(getEventStore().length).toBe(before + 1);
  });

  it("trackPageView records page_view event", () => {
    const before = getEventStore().length;
    trackPageView("/dashboard");
    const store = getEventStore();
    expect(store.length).toBe(before + 1);
    expect(store[store.length - 1].event).toBe("page_view");
  });

  it("trackLogin records user_login event with userId and role", () => {
    const before = getEventStore().length;
    trackLogin("42", "ADMINISTRADOR");
    const store = getEventStore();
    const entry = store[store.length - 1];
    expect(entry.event).toBe("user_login");
    expect(entry.properties?.userId).toBe("42");
    expect(entry.properties?.role).toBe("ADMINISTRADOR");
  });

  it("trackExport records export event", () => {
    const before = getEventStore().length;
    trackExport("csv", "transfers");
    const store = getEventStore();
    const entry = store[store.length - 1];
    expect(entry.event).toBe("export");
    expect(entry.properties?.format).toBe("csv");
    expect(entry.properties?.module).toBe("transfers");
  });

  it("event has timestamp and url", () => {
    track("test_ts");
    const store = getEventStore();
    const entry = store[store.length - 1];
    expect(entry.timestamp).toBeGreaterThan(0);
    expect(typeof entry.url).toBe("string");
  });
});
