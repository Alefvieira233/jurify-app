/**
 * Jurify Service Worker — lightweight offline-first caching.
 * Strategies: CacheFirst for static assets, NetworkFirst for API with cache fallback.
 */

const CACHE_NAME = 'jurify-v2';
const STATIC_CACHE = 'jurify-static-v2';
const API_CACHE = 'jurify-api-v2';
const FONT_CACHE = 'jurify-fonts-v2';

// Static assets to precache on install
const PRECACHE_URLS = ['/', '/index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Clear ALL old caches on activate (force fresh start)
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => ![STATIC_CACHE, API_CACHE, FONT_CACHE].includes(key))
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip non-http(s) schemes (chrome-extension://, etc)
  if (!url.protocol.startsWith('http')) return;

  // NEVER intercept auth requests — let them go straight to Supabase
  if (url.hostname.endsWith('.supabase.co') && url.pathname.startsWith('/auth/')) return;

  // Skip Edge Functions (never cache server-side logic)
  if (url.pathname.includes('/functions/v1/')) return;

  // Skip Sentry, Stripe, and other third-party APIs
  if (url.hostname.endsWith('.sentry.io') || url.hostname.endsWith('.stripe.com')) return;

  // Google Fonts — CacheFirst (only if same-origin or CORS-safe)
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(safeCacheFirst(request, FONT_CACHE));
    return;
  }

  // Supabase REST API — NetworkFirst with cache fallback
  if (url.hostname.endsWith('.supabase.co') && url.pathname.startsWith('/rest/')) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // Static assets (JS, CSS, images) — CacheFirst
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'image' ||
    request.destination === 'font'
  ) {
    event.respondWith(safeCacheFirst(request, STATIC_CACHE));
    return;
  }

  // HTML navigation — NetworkFirst (always try fresh)
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, STATIC_CACHE));
    return;
  }
});

/**
 * Cache-first with graceful fallback.
 * If fetch fails (CSP block, network error), returns cached version
 * or lets the browser handle it naturally (no fake 503).
 */
async function safeCacheFirst(request, cacheName) {
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
    // DON'T return fake 503 — let browser handle the failure naturally
    return cached || Response.error();
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || Response.error();
  }
}
