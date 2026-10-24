// Life Tracker service worker
// Caches the app shell + every script/resource it loads (React, icons, jsPDF, Babel, etc.)
// so the app can open and be used with no internet connection, after it has been
// opened at least once while online.

// IMPORTANT: bump this version string any time you change any cached file — including
// icons, manifest.json, or index.html itself. Changing this string is what makes the
// activate handler below actually throw away old cached bytes and pull fresh ones.
// If you forget to bump this, updated files can keep serving stale from cache indefinitely.
const CACHE_NAME = "life-tracker-cache-v10";

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
  // NO skipWaiting() here: a new version only waits. The app shows "Update available" on the More page and the
  // new version is switched on only when you tap Update now (that sends the SKIP_WAITING message handled below).
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // { cache: "reload" } forces this past the browser's normal HTTP cache. Each file is cached on its own so
      // one missing file doesn't stop the rest.
      await Promise.all(
        APP_SHELL.map((url) =>
          fetch(new Request(url, { cache: "reload" }))
            .then((res) => cache.put(url, res))
            .catch(() => {})
        )
      );
      // Carry over the libraries (React, icons, Babel...) already cached by the previous version so the app
      // still opens offline right after an update.
      try {
        const names = (await caches.keys()).filter((n) => n !== CACHE_NAME);
        for (const n of names) {
          const old = await caches.open(n);
          for (const r of await old.keys()) {
            if (!(await cache.match(r))) { const res = await old.match(r); if (res) await cache.put(r, res); }
          }
        }
      } catch (e) {}
    })
  );
});

// The app's "Update now" button sends this. Only then does the waiting version take over.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  // Update check from update.js: let it go straight to the network and
  // do not store it in the cache.
  if (req.url.includes("index.html?t=")) return;

  // Page navigations: open the version you have installed (works offline too). A newer version is only
  // picked up when you tap Update now on the More page. Network is used only if nothing is cached yet.
  if (req.mode === "navigate") {
    event.respondWith(
      caches.match("index.html").then((cached) =>
        cached ||
        fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("index.html", copy));
          return res;
        })
      )
    );
    return;
  }

  // Everything else (scripts, styles, fonts, CDN libraries, icons): cache first, network only when missing.
  // Nothing is refreshed silently in the background any more.
  event.respondWith(
    caches.match(req).then((cached) =>
      cached ||
      fetch(req).then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      })
    )
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

