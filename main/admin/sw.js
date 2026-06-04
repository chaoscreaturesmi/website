/* ============================================================
   CHAOS CREATURES — PWA SERVICE WORKER
   Enables offline cache loading fallback for husbandry portal
   ============================================================ */

const CACHE_NAME = 'chaos-husbandry-v1';
const ASSETS = [
  'index.html',
  'styles.css',
  'script.js',
  'initial_data.json',
  'manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Only intercept local HTTP/HTTPS requests (exclude CDNs or sheet endpoints if needed)
  if (event.request.url.startsWith(self.location.origin)) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) {
          // Serve from cache, but fetch fresh copy in background (stale-while-revalidate)
          fetch(event.request).then(networkResponse => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse));
            }
          }).catch(() => {/* Ignore network errors offline */});
          return cachedResponse;
        }
        return fetch(event.request);
      })
    );
  }
});
