// Life Tracker service worker
// Caches the app shell + every script/resource it loads (React, icons, jsPDF, Babel, etc.)
// so the app can open and be used with no internet connection, after it has been
// opened at least once while online.

const CACHE_NAME = "life-tracker-cache-v1";

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
      // addAll would fail entirely if even one file 404s — cache each
      // individually instead so the rest still get stored.
      Promise.all(
        APP_SHELL.map((url) =>
          cache.add(url).catch(() => {})
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
  // refresh the cache from the network so updates still get picked up.
  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req)
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
