// Service Worker — АНО Центр «Надежда»
// Лёгкий SW: даёт возможность установки сайта как приложения ("на главный экран"),
// при этом всегда отдаёт свежий контент из сети (без риска показать устаревшую страницу
// с некорректной анкетой на пожертвование).

const CACHE_NAME = 'nadezhda-shell-v1';
const OFFLINE_URL = 'index.html';

self.addEventListener('install', (event) => {
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
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          try { cache.put(event.request, copy); } catch (e) {}
        });
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => cached || caches.match(OFFLINE_URL))
      )
  );
});
