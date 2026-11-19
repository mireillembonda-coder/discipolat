// Ancienne adresse du Skin Analyzer : ce service worker supprime l'ancien cache
// (v1, v2 — pas celui du nouveau site) puis se désinstalle.
self.addEventListener('install', function() { self.skipWaiting(); });
self.addEventListener('activate', function(event) {
  event.waitUntil(Promise.all(['jireh-skin-v1', 'jireh-skin-v2'].map(function(k) { return caches.delete(k); }))
    .then(function() { return self.registration.unregister(); }));
});
