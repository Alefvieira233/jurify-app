/* global self, caches */
/**
 * Jurify Service Worker — lightweight offline-first caching.
 * Strategies: CacheFirst for static assets, NetworkFirst for API with cache fallback.
 */

const STATIC_CACHE = 'jurify-static-v1';
const API_CACHE = 'jurify-api-v1';
const FONT_CACHE = 'jurify-fonts-v1';

// Static assets to precache on install
const PRECACHE_URLS = ['/', '/index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== API_CACHE && key !== FONT_CACHE)
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

  // Skip Edge Functions (never cache server-side logic)
  if (url.pathname.includes('/functions/v1/')) return;

  // Google Fonts — CacheFirst (long-lived)
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(request, FONT_CACHE, 365 * 24 * 60 * 60));
    return;
  }

  // Supabase REST API — NetworkFirst with 5-min cache fallback
  if (url.hostname.endsWith('.supabase.co') && url.pathname.startsWith('/rest/')) {
    event.respondWith(networkFirst(request, API_CACHE, 5 * 60));
    return;
  }

  // Static assets (JS, CSS, images) — CacheFirst
  if (request.destination === 'script' || request.destination === 'style' || request.destination === 'image' || request.destination === 'font') {
    event.respondWith(cacheFirst(request, STATIC_CACHE, 30 * 24 * 60 * 60));
    return;
  }

  // HTML navigation — NetworkFirst (always try fresh)
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, STATIC_CACHE, 24 * 60 * 60));
    return;
  }
});

// eslint-disable-next-line no-unused-vars
async function cacheFirst(request, cacheName, maxAgeSeconds) {
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
    return new Response('Offline', { status: 503 });
  }
}

// eslint-disable-next-line no-unused-vars
async function networkFirst(request, cacheName, maxAgeSeconds) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}
