var cacheName = 'mikemjharris-blog-2';
var filesToCache = [
  "/",
  "/api/posts",
  "/dist/style.css",
  "/jquery/dist/jquery.js",
  "/handlebars/dist/handlebars.js",
  "/dist/templates.js",
  "/dist/main.js",
  "https://fonts.googleapis.com/css?family=Spinnaker",
  "https://fonts.googleapis.com/css?family=Inconsolata",
  "https://fonts.googleapis.com/css?family=Jura"
];

self.addEventListener('install', function(e) {
  console.log('[ServiceWorker] Install');
  e.waitUntil(
    caches.open(cacheName).then(function(cache) {
      console.log('[ServiceWorker] Caching app shell');
      return cache.addAll(filesToCache);
    })
  );
});

self.addEventListener('activate', function(e) {
  console.log('[ServiceWorker] Activate');
  e.waitUntil(
    caches.keys().then(function(keyList) {
      return Promise.all(keyList.map(function(key) {
        if (key !== cacheName) {
          console.log('[ServiceWorker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Cache hit - return response
        if (response) {
          return response;
        }

        return fetch(event.request);
      }
    )
  );
});