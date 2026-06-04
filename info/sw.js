/**
 * ============================================================
 * Chaos Creature Rescue — Service Worker
 * ============================================================
 *
 * Caching strategy:
 *   • Install  → Precache all critical static assets
 *   • Activate → Purge old cache versions
 *   • Fetch    → Cache-first for known static assets & fonts,
 *                Network-first for everything else
 *
 * Offline fallbacks:
 *   • Failed image requests  → inline SVG placeholder
 *   • Failed page requests   → inline offline HTML page
 *
 * All paths are relative (./) so the SW works correctly
 * regardless of the directory it is served from.
 * ============================================================
 */

// ── Cache configuration ─────────────────────────────────────
const CACHE_NAME = 'ccr-v4';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './manifest.json',
  './images/leopard-gecko.png',
  './images/crested-gecko.png',
  './images/ball-python.png',
  './images/blood-python.png',
  './images/feeder-rats.png',
  './images/dubia-roaches.png',
  './images/crickets.png',
  './images/hero-bg.png',
];

// ── Offline fallback content ────────────────────────────────

/** Inline SVG returned when an image request fails */
const OFFLINE_IMAGE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <rect width="400" height="300" fill="#1a1d23" rx="8"/>
  <text x="200" y="140" text-anchor="middle"
        font-family="system-ui, sans-serif" font-size="18" fill="#8b949e">
    Image Unavailable
  </text>
  <text x="200" y="170" text-anchor="middle"
        font-family="system-ui, sans-serif" font-size="13" fill="#6e7681">
    You appear to be offline
  </text>
</svg>`.trim();

/** Basic offline HTML returned when a navigation request fails */
const OFFLINE_PAGE_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Offline — Chaos Creature Rescue</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: system-ui, -apple-system, sans-serif;
      background: #0a0c10;
      color: #e6edf3;
      padding: 2rem;
      text-align: center;
    }
    .offline-container { max-width: 480px; }
    h1 { font-size: 2rem; margin-bottom: 1rem; }
    p  { color: #8b949e; line-height: 1.6; margin-bottom: 1.5rem; }
    .emoji { font-size: 4rem; margin-bottom: 1.5rem; display: block; }
    button {
      background: #58a6ff;
      color: #0d1117;
      border: none;
      padding: 0.75rem 2rem;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    button:hover { background: #79b8ff; }
  </style>
</head>
<body>
  <div class="offline-container">
    <span class="emoji">🦎</span>
    <h1>You're Offline</h1>
    <p>
      It looks like you've lost your internet connection.
      Some cached pages may still be available — try navigating
      back or reconnecting.
    </p>
    <button onclick="window.location.reload()">Try Again</button>
  </div>
</body>
</html>`.trim();

// ── Helper: is this URL one of our precached static assets? ─
/**
 * Checks whether the given request URL matches one of the
 * precached asset paths (resolved relative to the SW scope).
 */
function isStaticAsset(url) {
  return PRECACHE_ASSETS.some((asset) => {
    // Resolve the relative asset path against the SW scope
    const resolved = new URL(asset, self.registration.scope).href;
    return url === resolved;
  });
}

/**
 * Checks whether a URL is a Google Fonts request
 * (fonts.googleapis.com or fonts.gstatic.com).
 */
function isGoogleFontsRequest(url) {
  return (
    url.startsWith('https://fonts.googleapis.com') ||
    url.startsWith('https://fonts.gstatic.com')
  );
}

// ── Install ─────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Installing — cache:', CACHE_NAME);

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate ────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating — purging old caches');

  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => {
              console.log('[SW] Deleting old cache:', key);
              return caches.delete(key);
            })
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch ───────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests entirely (POST, PUT, etc.)
  if (request.method !== 'GET') return;

  const url = request.url;

  // ── Strategy 1: Cache-first for static precached assets ──
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // ── Strategy 2: Cache-first for Google Fonts CDN ─────────
  if (isGoogleFontsRequest(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // ── Strategy 3: Network-first for everything else ────────
  event.respondWith(networkFirst(request));
});

/**
 * Cache-first strategy.
 * Serve from cache if available; otherwise fetch from network,
 * cache the response, and return it. On total failure, return
 * an appropriate offline fallback.
 */
async function cacheFirst(request) {
  try {
    const cached = await caches.match(request);
    if (cached) return cached;

    const networkResponse = await fetch(request);
    // Clone before caching — responses are single-use streams
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (err) {
    return offlineFallback(request);
  }
}

/**
 * Network-first strategy.
 * Try the network; on success, cache the response. On failure
 * fall back to cache, then to an offline placeholder.
 */
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    // Cache successful GET responses for offline use
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (err) {
    // Network failed — try cache
    const cached = await caches.match(request);
    if (cached) return cached;

    // Nothing in cache either — return offline fallback
    return offlineFallback(request);
  }
}

/**
 * Produce an appropriate offline fallback response based on
 * the type of resource that was requested.
 */
function offlineFallback(request) {
  const accept = request.headers.get('Accept') || '';
  const url = request.url || '';

  // Image requests → inline SVG placeholder
  if (
    accept.includes('image') ||
    /\.(png|jpe?g|gif|svg|webp|avif|ico)(\?.*)?$/i.test(url)
  ) {
    return new Response(OFFLINE_IMAGE_SVG, {
      status: 200,
      headers: { 'Content-Type': 'image/svg+xml' },
    });
  }

  // HTML / navigation requests → inline offline page
  if (accept.includes('text/html') || request.mode === 'navigate') {
    return new Response(OFFLINE_PAGE_HTML, {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  // Everything else — generic 503
  return new Response('Offline — resource unavailable', {
    status: 503,
    headers: { 'Content-Type': 'text/plain' },
  });
}

// ── Message handler ─────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Received SKIP_WAITING message');
    self.skipWaiting();
  }
});
