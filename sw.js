/* ============================================================
   SERVICE WORKER — Santa Biblia 1909 IA
   Cachea todos los recursos en el navegador.
   El archivo bible.enc permanece cifrado en cache.
   ============================================================ */

const CACHE_NAME = 'biblia-1909-v1';
const ASSETS = [
  './',
  './index.html',
  './bible.enc',
  './manifest.json'
];

// ── Instalación: precachea todos los recursos ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// ── Activación: limpia caches antiguos ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: sirve desde cache primero (offline-first) ──
self.addEventListener('fetch', event => {
  // Solo intercepta recursos de este origen
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      // Si no está en cache, descarga y guarda
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200) return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => {
        // Fallback offline: devuelve index si es navegación
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
