// Minimal service worker — its only job is to satisfy PWA installability
// criteria (Chrome requires an active service worker with a fetch handler
// before it will show the "Install app" prompt). It passes all requests
// straight through to the network; it does not cache anything.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
