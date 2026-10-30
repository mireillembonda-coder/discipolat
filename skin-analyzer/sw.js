// Garde le Skin Analyzer en mémoire pour qu'il fonctionne sans internet,
// PDF compris. Changer CACHE à chaque mise à jour des fichiers ci-dessous.
var CACHE = 'jireh-skin-v1';
var FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'vendor/jspdf.umd.min.js',
  'vendor/fonts/dm-sans-latin-400-normal.woff2',
  'vendor/fonts/dm-sans-latin-500-normal.woff2',
  'vendor/fonts/dm-sans-latin-600-normal.woff2',
  'vendor/fonts/dm-sans-latin-700-normal.woff2',
  'vendor/fonts/cormorant-garamond-latin-600-normal.woff2',
  'vendor/fonts/cormorant-garamond-latin-600-italic.woff2',
  'vendor/fonts/cormorant-garamond-latin-700-italic.woff2',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-512.png',
  'icons/apple-touch-icon.png'
];

self.addEventListener('install', function(event) {
  event.waitUntil(caches.open(CACHE).then(function(cache) { return cache.addAll(FILES); }));
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(caches.keys().then(function(keys) {
    return Promise.all(keys.filter(function(k) { return k.indexOf('jireh-skin-') === 0 && k !== CACHE; })
      .map(function(k) { return caches.delete(k); }));
  }));
  self.clients.claim();
});

// Réseau d'abord (pour recevoir les mises à jour), mémoire si pas de connexion
self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== location.origin) return;
  event.respondWith(
    fetch(event.request).then(function(response) {
      var copy = response.clone();
      caches.open(CACHE).then(function(cache) { cache.put(event.request, copy); });
      return response;
    }).catch(function() {
      return caches.match(event.request, { ignoreSearch: true }).then(function(hit) {
        return hit || caches.match('index.html');
      });
    })
  );
});
