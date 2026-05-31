/**
 * Banco DDD — Service Worker Enterprise
 * Strategy: Cache-first for static assets, Network-first for API, Stale-while-revalidate for pages
 */

const CACHE_VERSION = "v3";
const STATIC_CACHE = `banco-static-${CACHE_VERSION}`;
const PAGES_CACHE = `banco-pages-${CACHE_VERSION}`;
const API_CACHE = `banco-api-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  "/",
  "/login",
  "/offline",
  "/manifest.json",
  "/icons/icon-192.svg",
  "/icons/icon-512.svg",
];

const API_BASE = "/api";

// ── Install ───────────────────────────────────────────────────────────────────

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) =>
        cache.addAll(STATIC_ASSETS).catch((err) => {
          console.warn("[SW] Failed to cache some static assets:", err);
        })
      )
      .then(() => self.skipWaiting())
  );
});

// ── Activate ──────────────────────────────────────────────────────────────────

self.addEventListener("activate", (event) => {
  const VALID_CACHES = [STATIC_CACHE, PAGES_CACHE, API_CACHE];
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !VALID_CACHES.includes(k))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Skip non-same-origin requests (except API)
  if (url.origin !== self.location.origin && !url.pathname.startsWith(API_BASE)) {
    return;
  }

  // API requests — Network first, fallback to cache
  if (url.pathname.startsWith(API_BASE) || url.hostname !== self.location.hostname) {
    event.respondWith(networkFirstStrategy(request, API_CACHE, 5000));
    return;
  }

  // Next.js static assets — Cache first
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".ico") ||
    url.pathname === "/manifest.json"
  ) {
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
    return;
  }

  // HTML pages — Stale while revalidate
  if (request.destination === "document" || request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(staleWhileRevalidate(request, PAGES_CACHE));
    return;
  }

  // Everything else — Network first
  event.respondWith(networkFirstStrategy(request, PAGES_CACHE, 8000));
});

// ── Strategies ────────────────────────────────────────────────────────────────

async function cacheFirstStrategy(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return offlineFallback(request);
  }
}

async function networkFirstStrategy(request, cacheName, timeoutMs = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    clearTimeout(timeoutId);
    const cached = await caches.match(request);
    if (cached) return cached;
    return offlineFallback(request);
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  return cached ?? (await fetchPromise) ?? offlineFallback(request);
}

async function offlineFallback(request) {
  if (request.destination === "document" || request.headers.get("accept")?.includes("text/html")) {
    const offlinePage = await caches.match("/offline");
    if (offlinePage) return offlinePage;
  }
  return new Response("Offline — Sin conexión", {
    status: 503,
    headers: { "Content-Type": "text/plain" },
  });
}

// ── Background Sync ───────────────────────────────────────────────────────────

self.addEventListener("sync", (event) => {
  if (event.tag === "sync-pending-transfers") {
    event.waitUntil(syncPendingTransfers());
  }
});

async function syncPendingTransfers() {
  // Notify all clients that sync is happening
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({ type: "BACKGROUND_SYNC", tag: "sync-pending-transfers" });
  });
}

// ── Push Notifications ────────────────────────────────────────────────────────

self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title ?? "Banco DDD", {
      body: data.body ?? "Tienes una nueva notificación",
      icon: "/icons/icon-192.svg",
      badge: "/icons/icon-192.svg",
      tag: data.tag ?? "banco-notification",
      data: data.url ? { url: data.url } : undefined,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.notification.data?.url) {
    event.waitUntil(self.clients.openWindow(event.notification.data.url));
  }
});

// ── Message handler ───────────────────────────────────────────────────────────

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data?.type === "CLEAR_CACHE") {
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
  }
});
