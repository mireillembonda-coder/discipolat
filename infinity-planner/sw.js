// Garde Infinity Planner en mémoire pour qu'il fonctionne sans internet.
// Changer CACHE à chaque mise à jour des fichiers ci-dessous.
var CACHE = 'infinity-planner-v1';
var FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'versets.js',
  'vendor/fonts/bricolage-grotesque-latin-500-normal.woff2',
  'vendor/fonts/bricolage-grotesque-latin-700-normal.woff2',
  'vendor/fonts/nunito-sans-latin-400-normal.woff2',
  'vendor/fonts/nunito-sans-latin-600-normal.woff2',
  'vendor/fonts/nunito-sans-latin-700-normal.woff2',
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
    return Promise.all(keys.filter(function(k) { return k.indexOf('infinity-planner-') === 0 && k !== CACHE; })
      .map(function(k) { return caches.delete(k); }));
  }));
  self.clients.claim();
});

// Mémoire d'abord : l'agenda s'ouvre tout de suite, même sans réseau.
// La version en ligne est récupérée en arrière-plan pour la prochaine ouverture.
self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== location.origin) return;
  var page = event.request.mode === 'navigate';
  event.respondWith(caches.open(CACHE).then(function(cache) {
    var cle = page ? 'index.html' : event.request;
    return cache.match(cle, { ignoreSearch: true }).then(function(hit) {
      var reseau = fetch(event.request).then(function(response) {
        if (response && response.ok) cache.put(cle, response.clone());
        return response;
      });
      if (hit) { event.waitUntil(reseau.catch(function() {})); return hit; }
      return reseau.catch(function() { return cache.match('index.html'); });
    });
  }));
});
