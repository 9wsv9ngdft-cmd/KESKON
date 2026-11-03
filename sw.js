// Cache léger pour que KESKON s'ouvre même sans réseau
const CACHE = 'keskon-v1';
const BASE = ['./', 'index.html', 'style.css', 'app.js', 'data/rubriques.json', 'data/eco.json', 'icon-512.png', 'manifest.webmanifest', 'lib/mini.js'];
self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(BASE)).then(() => self.skipWaiting())));
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((x) => x !== CACHE).map((x) => caches.delete(x)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // Notre site : réseau d'abord (toujours la dernière version), cache en secours
  if (u.origin === location.origin) {
    e.respondWith(fetch(e.request).then((r) => { const c = r.clone(); caches.open(CACHE).then((x) => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request)));
  } else if (u.hostname.endsWith('wikimedia.org')) {
    // Librairie et photos : cache d'abord
    e.respondWith(caches.match(e.request).then((m) => m || fetch(e.request).then((r) => { const c = r.clone(); caches.open(CACHE).then((x) => x.put(e.request, c)); return r; })));
  }
});
