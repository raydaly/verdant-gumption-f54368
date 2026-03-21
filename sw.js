var CACHE_NAME = 'greatuncle-v37';
var STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/src/core/constants.js',
  '/src/storage/db.js',
  '/src/storage/settings.js',
  '/src/storage/contacts.js',
  '/src/storage/logs.js',
  '/src/ui/boot.js',
  '/src/ui/app.js',
  '/src/styles/main.css',
  '/src/ui/router.js',
  '/src/ui/people.js',
  '/src/ui/contact-form.js',
  '/src/ui/components/horizon-bar.js',
  '/src/ui/components/level-selector.js',
  '/src/ui/components/tag-input.js',
  '/src/ui/components/contact-profile.js',
  '/src/core/outreach-engine.js',
  '/src/core/seedling.js',
  '/src/core/calendar.js',
  '/src/core/milestone-engine.js',
  '/src/core/sanitizer.js',
  '/src/ui/home.js',
  '/src/ui/journal.js',
  '/src/ui/trunk.js',
  '/src/ui/settings.js',
  '/src/ui/onboarding.js',
  '/src/ui/stewardship.js',
  '/src/ui/milestone-calendar.js',
  '/src/ui/share-review.js',
  '/src/ui/about.js',
  '/src/ui/components/bottom-sheet.js',
  '/src/ui/components/toast.js',
  '/src/ui/components/connected-sheet.js',
  '/src/ui/components/confirm-dialog.js',
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(STATIC_ASSETS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) {
          return key !== CACHE_NAME;
        }).map(function (key) {
          return caches.delete(key);
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached;

      return fetch(event.request).then(function (response) {
        var responseClone = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(event.request, responseClone);
        });
        return response;
      });
    })
  );
});
