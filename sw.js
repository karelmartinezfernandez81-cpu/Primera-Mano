/* ══ SERVICE WORKER v4 — Santa Biblia 1909 IA ══
   Pre-cachea todo en install, incluyendo bible.enc
   Sirve 100% offline en visitas siguientes          */

const CACHE = 'bsa-v4';
const PRECACHE = ['./', './index.html', './bible.enc', './manifest.json'];

/* ── Install: cachear TODO antes de activar ── */
self.addEventListener('install', e => {
  self.skipWaiting();          /* activar sin esperar tab viejo */
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).catch(() => {})
  );
});

/* ── Activate: borrar cachés viejos y tomar control ── */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(() => self.clients.claim())   /* controlar tabs abiertos ya */
  );
});

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

/* ── Fetch: cache-first, red como fallback ── */
self.addEventListener('fetch', e => {
  if (!e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    caches.match(e.request).then(hit => {
      if (hit) return hit;          /* sirve desde caché */
      return fetch(e.request).then(res => {
        if (!res || res.status !== 200) return res;
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => {
        /* Sin red y sin caché: para navigate devolver index */
        if (e.request.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});
