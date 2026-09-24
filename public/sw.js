const CACHE_NAME = 'petsuite-shell-v2'

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(['/'])));
  self.skipWaiting();
})

self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('petsuite-shell-') && key !== CACHE_NAME).map(key => caches.delete(key)))),
    self.clients.claim(),
  ]))
})

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match('/')))
    return
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)))
})
