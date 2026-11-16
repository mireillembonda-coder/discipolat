// Garde l'application de la pharmacie en mémoire pour qu'elle s'ouvre même avec un réseau faible.
// Les données viennent du serveur (Google Apps Script) ; les saisies faites hors ligne attendent sur le téléphone.
// Changer CACHE à chaque mise à jour des fichiers ci-dessous.
var CACHE = 'pharmacie-v1';
var FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'js/config.js',
  'js/api.js',
  'js/app.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-512.png',
  'icons/apple-touch-icon.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(caches.open(CACHE).then(function (cache) { return cache.addAll(FILES); }));
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf('pharmacie-') === 0 && k !== CACHE; })
      .map(function (k) { return caches.delete(k); }));
  }));
  self.clients.claim();
});

// Réseau d'abord (pour avoir la dernière version), mémoire si pas de réseau.
self.addEventListener('fetch', function (event) {
  var url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== location.origin) return;
  var page = event.request.mode === 'navigate';
  var cle = page ? 'index.html' : event.request;
  event.respondWith(caches.open(CACHE).then(function (cache) {
    return fetch(event.request).then(function (response) {
      if (response && response.ok) cache.put(cle, response.clone());
      return response;
    }).catch(function () {
      return cache.match(cle, { ignoreSearch: true }).then(function (hit) { return hit || cache.match('index.html'); });
    });
  }));
});
