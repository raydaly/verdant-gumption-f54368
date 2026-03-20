const CACHE_NAME = 'greatuncle-v28';
const ASSETS = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/js/app.js',
    '/js/ui.js',
    '/manifest.json',
    '/assets/images/icon-192.png',
    '/assets/images/icon-512.png'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    // Skip cross-origin and non-HTTP requests (like chrome-extension://)
    if (!event.request.url.startsWith('http')) return;

    // Network First strategy: Try the network, fall back to cache
    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                // Ensure we only cache valid, same-origin successful responses
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }

                // If valid, clone and update the cache
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });

                return networkResponse;
            })
            .catch(() => {
                // If network fails (offline), return from cache
                return caches.match(event.request);
            })
    );
});
