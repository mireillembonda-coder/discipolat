// Garde Infinity Planner en mémoire pour qu'il fonctionne sans internet.
// Changer CACHE à chaque mise à jour des fichiers ci-dessous.
var CACHE = 'infinity-planner-v4';
var FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'js/versets.js',
  'js/data.js',
  'js/store.js',
  'js/ui.js',
  'js/parcours.js',
  'js/agenda.js',
  'js/app.js',
  'vendor/fonts/spectral-latin-500-normal.woff2',
  'vendor/fonts/spectral-latin-600-normal.woff2',
  'vendor/fonts/spectral-latin-400-italic.woff2',
  'vendor/fonts/great-vibes-latin-400-normal.woff2',
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

// Réseau d'abord (3 secondes au plus) pour toujours afficher la dernière version ;
// si le réseau est absent ou trop lent, on ouvre la copie gardée sur le téléphone.
self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== location.origin) return;
  var page = event.request.mode === 'navigate';
  var cle = page ? 'index.html' : event.request;
  event.respondWith(caches.open(CACHE).then(function(cache) {
    var reseau = fetch(event.request, { cache: 'no-cache' }).then(function(response) {
      if (response && response.ok) cache.put(cle, response.clone());
      return response;
    });
    var delai = new Promise(function(ok) { setTimeout(ok, 3000); }).then(function() {
      return cache.match(cle, { ignoreSearch: true });
    });
    return Promise.race([reseau.catch(function() { return cache.match(cle, { ignoreSearch: true }); }), delai.then(function(hit) { return hit || reseau; })])
      .then(function(r) { return r || cache.match('index.html'); });
  }));
});
