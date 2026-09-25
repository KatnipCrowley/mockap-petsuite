const CACHE_NAME = 'petsuite-shell-v3'
const APP_URL = self.registration.scope

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll([APP_URL])));
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
    event.respondWith(fetch(event.request).catch(() => caches.match(APP_URL)))
    return
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)))
})
