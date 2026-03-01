/* Santa Biblia 1909 SW v6
   Dos cachés separados:
     bsa-shell  → assets estáticos (index.html, sw.js, manifest.json)
     bsa-vault  → token cifrado (/_tok_) + contenido cifrado (/_cnt_)
   El contenido bíblico vive cifrado en bsa-vault para siempre.       */

const V           = 'v6';
const SHELL_CACHE = 'bsa-shell-' + V;
const VAULT_CACHE = 'bsa-vault-' + V;
const TOK_URL     = '/_tok_';   /* token de auth cifrado     */
const CNT_URL     = '/_cnt_';   /* HTML bíblico re-cifrado   */
const SHELL_FILES = ['./', './index.html', './sw.js', './manifest.json'];

/* ─── Install ─── */
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(SHELL_CACHE)
      .then(c => c.addAll(SHELL_FILES))
      .catch(() => {})
  );
});

/* ─── Activate ─── */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== SHELL_CACHE && k !== VAULT_CACHE)
            .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* ─── Messages ─── */
self.addEventListener('message', async e => {
  const { type, data } = e.data || {};

  /* Guardar token en vault */
  if (type === 'SAVE_TOK') {
    const c = await caches.open(VAULT_CACHE);
    await c.put(TOK_URL, new Response(data, {
      headers: { 'Content-Type': 'text/plain', 'X-BSA': '1' }
    }));
    e.source && e.source.postMessage({ type: 'TOK_SAVED' });
    return;
  }

  /* Guardar contenido bíblico cifrado en vault */
  if (type === 'SAVE_CNT') {
    const c = await caches.open(VAULT_CACHE);
    await c.put(CNT_URL, new Response(data, {
      headers: { 'Content-Type': 'text/plain', 'X-BSA': '1' }
    }));
    e.source && e.source.postMessage({ type: 'CNT_SAVED' });
    return;
  }

  if (type === 'SKIP_WAITING') self.skipWaiting();
});

/* ─── Fetch ─── */
self.addEventListener('fetch', e => {
  const path = new URL(e.request.url).pathname;

  /* Rutas del vault → servir desde bsa-vault */
  if (path === TOK_URL || path === CNT_URL ||
      path.endsWith(TOK_URL) || path.endsWith(CNT_URL)) {
    e.respondWith(
      caches.open(VAULT_CACHE).then(c => c.match(
        path === TOK_URL || path.endsWith(TOK_URL) ? TOK_URL : CNT_URL
      )).then(r =>
        r || new Response('', { status: 204 })
      )
    );
    return;
  }

  /* No interceptar peticiones externas */
  if (!e.request.url.startsWith(self.location.origin)) return;

  /* Shell → cache-first */
  e.respondWith(
    caches.match(e.request).then(hit => {
      if (hit) return hit;
      return fetch(e.request).then(res => {
        if (!res || res.status !== 200) return res;
        caches.open(SHELL_CACHE).then(c => c.put(e.request, res.clone()));
        return res;
      }).catch(() =>
        e.request.mode === 'navigate' ? caches.match('./index.html') : undefined
      );
    })
  );
});
