const CACHE_NAME = 'erdungscheck-v2'; // Version erhöht für Cache-Busting
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Nur GET-Requests verarbeiten
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
      // 1. Wenn im Cache vorhanden, sofort liefern
      if (cachedResponse) {
        return cachedResponse;
      }

      // 2. Netzwerkanfrage versuchen
      return fetch(event.request)
        .then((networkResponse) => {
          // Cache befüllen für gültige Responses (inkl. opaque responses von CDNs)
          if (
            networkResponse &&
            (networkResponse.status === 200 || networkResponse.type === 'opaque')
          ) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // 3. Robustes Fallback für Navigationsanfragen (HTML-Seiten)
          if (event.request.mode === 'navigate') {
            const cache = await caches.open(CACHE_NAME);
            return (
              (await cache.match('./index.html')) ||
              (await cache.match('./'))
            );
          }
        });
    })
  );
});
