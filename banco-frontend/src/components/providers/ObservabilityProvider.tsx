"use client";

import { useEffect } from "react";
import { logMetric } from "@/lib/monitoring/client";
import { trackPageView } from "@/lib/analytics/client";

export function ObservabilityProvider() {
  useEffect(() => {
    trackPageView(window.location.pathname);

    const entries = performance.getEntriesByType("navigation");
    if (entries.length > 0) {
      const nav = entries[0] as PerformanceNavigationTiming;
      logMetric("navigation", {
        domComplete: nav.domComplete,
        domInteractive: nav.domInteractive,
        loadEventEnd: nav.loadEventEnd,
        type: nav.type,
      });
    }
  }, []);

  return null;
}
