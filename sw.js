// Garde la page de Discipolat en mémoire pour qu'elle s'ouvre tout de suite.
// Les données, elles, viennent toujours d'Apps Script (en ligne).
var CACHE = 'discipolat-v5';
var FILES = [
  'index.html',
  'classique.html',
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
    // Ne supprimer que les anciennes mémoires de Discipolat (pas celles
    // d'Infinity Planner ou du Skin Analyzer, qui sont sur le même site).
    return Promise.all(keys.filter(function(k) { return k.indexOf('discipolat-') === 0 && k !== CACHE; })
      .map(function(k) { return caches.delete(k); }));
  }));
  self.clients.claim();
});

// Mémoire d'abord : la coquille s'ouvre tout de suite depuis le téléphone,
// même si github.io répond mal (données mobiles). La version en ligne est
// récupérée en arrière-plan et servira à la prochaine ouverture.
self.addEventListener('fetch', function(event) {
  var url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== location.origin) return;
  // Seulement la coquille Discipolat elle-même : les autres applications du site
  // (infinity-planner/, skin-analyzer/…) ont leurs propres fichiers et leur propre mémoire.
  var chemin = url.pathname.slice(new URL(self.registration.scope).pathname.length);
  if (chemin.indexOf('/') !== -1 && chemin.indexOf('icons/') !== 0) return;
  // Page d'accueil (« / », « /?espace=… ») = index.html ; classique.html reste classique.html.
  var cle = chemin === '' ? 'index.html' : (event.request.mode === 'navigate' ? chemin : event.request);
  event.respondWith(caches.open(CACHE).then(function(cache) {
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
