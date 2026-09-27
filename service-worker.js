// Life Tracker service worker
// Caches the app shell + every script/resource it loads (React, icons, jsPDF, Babel, etc.)
// so the app can open and be used with no internet connection, after it has been
// opened at least once while online.

// IMPORTANT: bump this version string any time you change any cached file — including
// icons, manifest.json, or index.html itself. Changing this string is what makes the
// activate handler below actually throw away old cached bytes and pull fresh ones.
// If you forget to bump this, updated files can keep serving stale from cache indefinitely.
const CACHE_NAME = "life-tracker-cache-v2";

// Core files that make up the app shell — cached immediately on install.
const APP_SHELL = [
  "./",
  "index.html",
  "manifest.json",
  "icon-192.png",
  "icon-512.png",
  "apple-touch-icon.png",
  "favicon-16.png",
  "favicon-32.png",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // { cache: "reload" } forces this past the browser's normal HTTP cache, so we
      // store what's actually on the server right now, not whatever was last fetched.
      // addAll would fail entirely if even one file 404s — cache each individually
      // instead so the rest still get stored.
      Promise.all(
        APP_SHELL.map((url) =>
          fetch(new Request(url, { cache: "reload" }))
            .then((res) => cache.put(url, res))
            .catch(() => {})
        )
      )
    )
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  // Page navigations: try the network first so you get the latest version
  // when online, but fall back to the cached app so it still opens offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("index.html", copy));
          return res;
        })
        .catch(() =>
          caches.match("index.html").then((cached) => cached || caches.match(req))
        )
    );
    return;
  }

  // Everything else (scripts, styles, fonts, CDN libraries, icons): serve from
  // cache when available for instant + offline loading, and in the background
  // refresh the cache from the network (bypassing HTTP cache) so updates still
  // get picked up for next time.
  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(new Request(req.url, { cache: "reload" }))
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});

// ---- Push notifications ----
// Fires when a push message arrives from the push service, even if the app/tab
// is closed. The payload is set by whatever server sends the push (your Apps
// Script + serverless sender) as JSON: { title, body, url }.
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) {}
  const title = data.title || "Life Tracker";
  const body = data.body || "You have a reminder.";
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "icon-192.png",
      badge: "icon-192.png",
      data: { url: data.url || "./" },
    })
  );
});

// Tapping the notification focuses an already-open tab if there is one,
// otherwise opens a new one at the app's root (or the URL the push specified).
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "./";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});

