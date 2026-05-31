/**
 * Frontend analytics client — tracks user interactions, page views and flows.
 * Designed to be swapped for a real analytics provider (Segment, Mixpanel, etc.).
 */

export interface AnalyticsEvent {
  event: string;
  properties?: Record<string, unknown>;
  timestamp: number;
  sessionId: string;
  userId?: string;
  url: string;
}

// ── In-memory event store ─────────────────────────────────────────────────────

const EVENT_MAX = 500;
const eventStore: AnalyticsEvent[] = [];

function getSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  return sessionStorage.getItem("banco_session_id") ?? "unknown";
}

function getUserId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = sessionStorage.getItem("banco-auth");
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    return parsed?.state?.user?.idUsuario
      ? String(parsed.state.user.idUsuario)
      : undefined;
  } catch {
    return undefined;
  }
}

// ── Core track function ───────────────────────────────────────────────────────

export function track(
  event: string,
  properties?: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;

  const entry: AnalyticsEvent = {
    event,
    properties,
    timestamp: Date.now(),
    sessionId: getSessionId(),
    userId: getUserId(),
    url: window.location.pathname,
  };

  eventStore.push(entry);
  if (eventStore.length > EVENT_MAX) {
    eventStore.shift();
  }

  if (process.env.NODE_ENV === "development") {
    console.debug(`[Analytics] ${event}`, properties ?? "");
  }
}

// ── Page view ─────────────────────────────────────────────────────────────────

export function trackPageView(path: string): void {
  track("page_view", { path, referrer: document.referrer || undefined });
}

// ── User actions ──────────────────────────────────────────────────────────────

export function trackLogin(userId: string, role: string): void {
  track("user_login", { userId, role });
}

export function trackLogout(): void {
  track("user_logout");
}

export function trackTransferCreated(amount: number, requiresApproval: boolean): void {
  track("transfer_created", { amount, requiresApproval });
}

export function trackTransferApproved(transferId: number): void {
  track("transfer_approved", { transferId });
}

export function trackLoanRequested(type: string, amount: number): void {
  track("loan_requested", { type, amount });
}

export function trackBatchCreated(itemCount: number, totalAmount: number): void {
  track("batch_created", { itemCount, totalAmount });
}

export function trackExport(format: string, module: string): void {
  track("export", { format, module });
}

export function trackSearch(query: string, module: string): void {
  track("search", { query: query.slice(0, 50), module });
}

export function trackCommandPalette(action: string): void {
  track("command_palette", { action });
}

// ── Retrieve events (for debug) ───────────────────────────────────────────────

export function getEventStore(): AnalyticsEvent[] {
  return [...eventStore];
}
