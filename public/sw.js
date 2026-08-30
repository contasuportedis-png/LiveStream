const CACHE_NAME = 'livestream-v1';
const URLS_TO_CACHE = ['/', '/mobile', '/manifest.json'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(URLS_TO_CACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Não cacheia WebSocket nem API
  if (event.request.url.includes('/ws') || event.request.url.includes('/health')) return;
  event.respondWith(
    caches.match(event.request).then(resp => resp || fetch(event.request).catch(()=> caches.match('/')) )
  );
});
