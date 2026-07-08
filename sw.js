// Paisa SW v11 — update this version string with every deployment
const CACHE_VERSION = 'paisa-v11';
const ASSETS = [
  '/paisa-app/',
  '/paisa-app/index.html',
  '/paisa-app/manifest.json',
  '/paisa-app/icon-192.png',
  '/paisa-app/icon-512.png'
];

// INSTALL: cache all assets fresh
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()) // activate immediately, don't wait
  );
});

// ACTIVATE: delete ALL old caches, claim all clients immediately
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_VERSION).map(k => {
          console.log('[Paisa SW] Deleting old cache:', k);
          return caches.delete(k);
        })
      ))
      .then(() => self.clients.claim()) // take control of all open tabs now
  );
});

// FETCH: network first for HTML (always get latest), cache fallback for assets
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  
  // For HTML pages: always try network first so updates show immediately
  if (e.request.destination === 'document' || url.pathname.endsWith('.html')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          // Update cache with fresh copy
          const resClone = res.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(e.request, resClone));
          return res;
        })
        .catch(() => caches.match(e.request)) // offline fallback
    );
    return;
  }

  // For other assets (images, etc): cache first, network fallback
  e.respondWith(
    caches.match(e.request)
      .then(cached => cached || fetch(e.request)
        .then(res => {
          const resClone = res.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(e.request, resClone));
          return res;
        })
      )
  );
});
