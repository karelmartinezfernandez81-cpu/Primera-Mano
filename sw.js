/* ══ Santa Biblia 1909 SW v5 ══
   El token de auth vive dentro del caché del SW.
   URL sintética: /_bsa_auth_  (nunca sale a la red)      */

const CACHE_ASSETS = 'bsa-assets-v5';
const CACHE_AUTH   = 'bsa-auth-v5';
const AUTH_URL     = '/_bsa_auth_';
const PRECACHE     = ['./', './index.html', './bible.enc', './manifest.json'];

/* ── Install: cachear assets + activar sin esperar ── */
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_ASSETS).then(c => c.addAll(PRECACHE)).catch(()=>{})
  );
});

/* ── Activate: borrar cachés viejos, tomar control inmediato ── */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(
        ks.filter(k => k!==CACHE_ASSETS && k!==CACHE_AUTH).map(k=>caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* ── Messages desde la página ── */
self.addEventListener('message', async e => {
  /* Guardar token cifrado en el caché de auth */
  if (e.data && e.data.type === 'SAVE_AUTH') {
    const cache = await caches.open(CACHE_AUTH);
    const res   = new Response(
      JSON.stringify({ tok: e.data.tok, ts: Date.now() }),
      { headers: { 'Content-Type': 'application/json', 'X-BSA': '1' } }
    );
    await cache.put(AUTH_URL, res);
    /* Responder confirmación */
    if (e.source) e.source.postMessage({ type: 'AUTH_SAVED', ok: true });
    return;
  }
  /* Borrar token */
  if (e.data && e.data.type === 'CLEAR_AUTH') {
    const cache = await caches.open(CACHE_AUTH);
    await cache.delete(AUTH_URL);
    return;
  }
  /* Skip waiting */
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

/* ── Fetch ── */
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  /* URL sintética de auth — servir desde caché de auth */
  if (url.pathname === AUTH_URL || url.pathname.endsWith(AUTH_URL)) {
    e.respondWith(
      caches.open(CACHE_AUTH).then(c => c.match(AUTH_URL)).then(r =>
        r ? r : new Response('null', { status: 200, headers: {'Content-Type':'application/json'} })
      )
    );
    return;
  }

  /* No interceptar peticiones externas */
  if (!e.request.url.startsWith(self.location.origin)) return;

  /* Cache-first para assets */
  e.respondWith(
    caches.match(e.request).then(hit => {
      if (hit) return hit;
      return fetch(e.request).then(res => {
        if (!res || res.status !== 200) return res;
        const clone = res.clone();
        caches.open(CACHE_ASSETS).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => {
        if (e.request.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});
