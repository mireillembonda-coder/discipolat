// Garde la coquille de Discipolat en mémoire pour qu'elle s'ouvre vite.
// Les données, elles, viennent toujours d'Apps Script (en ligne).
var CACHE = 'discipolat-v3';
var FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-512.png'
];

self.addEventListener('install', function(event) {
  event.waitUntil(caches.open(CACHE).then(function(cache) { return cache.addAll(FILES); }));
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(caches.keys().then(function(keys) {
    return Promise.all(keys.filter(function(k) { return k !== CACHE; })
      .map(function(k) { return caches.delete(k); }));
  }));
  self.clients.claim();
});

// Mémoire d'abord : la coquille s'ouvre tout de suite depuis le téléphone,
// même si github.io répond mal (données mobiles). La version en ligne est
// récupérée en arrière-plan et servira à la prochaine ouverture.
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
      if (hit) {
        event.waitUntil(reseau.catch(function() {}));
        return hit;
      }
      return reseau.catch(function() { return cache.match('index.html'); });
    });
  }));
});
