const CACHE_VERSION = 'paisa-v15';
const ASSETS = ['/paisa-app/','/paisa-app/index.html','/paisa-app/manifest.json','/paisa-app/icon-192.png','/paisa-app/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE_VERSION).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.destination === 'document' || url.pathname.endsWith('.html')) {
    e.respondWith(fetch(e.request).then(res => { const clone = res.clone(); caches.open(CACHE_VERSION).then(ca => ca.put(e.request, clone)); return res; }).catch(() => caches.match(e.request)));
    return;
  }
  e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request).then(res => { const clone = res.clone(); caches.open(CACHE_VERSION).then(ca => ca.put(e.request, clone)); return res; })));
});
