/* Santa Biblia 1909 SW v7 */
const SHELL = 'bsa-shell-v7';
const VAULT = 'bsa-vault-v7';
const T_URL = '/_tok_';
const C_URL = '/_cnt_';
const SHELL_FILES = ['./', './index.html', './sw.js', './manifest.json'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(SHELL_FILES)).catch(()=>{}));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k=>k!==SHELL&&k!==VAULT).map(k=>caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', async e => {
  const d = e.data || {};
  if (d.type === 'SAVE_TOK') {
    const c = await caches.open(VAULT);
    await c.put(T_URL, new Response(d.data, {headers:{'Content-Type':'text/plain'}}));
    if(e.source) e.source.postMessage({type:'TOK_OK'});
    return;
  }
  if (d.type === 'SAVE_CNT') {
    const c = await caches.open(VAULT);
    await c.put(C_URL, new Response(d.data, {headers:{'Content-Type':'text/plain'}}));
    if(e.source) e.source.postMessage({type:'CNT_OK'});
    return;
  }
  if (d.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  const p = u.pathname;
  if (p.endsWith(T_URL) || p.endsWith(C_URL) || p===T_URL || p===C_URL) {
    const key = (p.endsWith(T_URL)||p===T_URL) ? T_URL : C_URL;
    e.respondWith(
      caches.open(VAULT).then(c=>c.match(key)).then(r=>
        r ? r : new Response('', {status:204})
      )
    );
    return;
  }
  if (!e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    caches.match(e.request).then(hit => {
      if (hit) return hit;
      return fetch(e.request).then(res => {
        if(res && res.status===200) caches.open(SHELL).then(c=>c.put(e.request, res.clone()));
        return res;
      }).catch(() => e.request.mode==='navigate' ? caches.match('./index.html') : undefined);
    })
  );
});
