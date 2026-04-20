// Kill-switch service worker.
//
// An earlier deploy registered a caching service worker that still lives in
// users' browsers and intercepts every request, serving stale HTML forever.
// Main no longer references sw.js from index.html, but the browser keeps
// fetching this file on roughly daily checks (or immediately on reload) to
// look for updates. When it sees this version, it unregisters itself,
// deletes every cache, and force-reloads any open tab — so the next load
// fetches the current HTML directly from the network.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch (e) {}
    try {
      await self.registration.unregister();
    } catch (e) {}
    try {
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((c) => {
        try { c.navigate(c.url); } catch (e) {}
      });
    } catch (e) {}
  })());
});

self.addEventListener('fetch', (event) => {
  // Always bypass cache while this kill-switch is active.
  event.respondWith(fetch(event.request));
});
