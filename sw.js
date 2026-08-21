const CACHE = 'mgt-v20';
const ASSETS = ['./', './index.html', './manifest.json',
  './assets/fonts/eb-garamond-400-normal.woff2','./assets/fonts/eb-garamond-400-italic.woff2',
  './assets/fonts/ibm-plex-mono-400-normal.woff2','./assets/fonts/ibm-plex-mono-500-normal.woff2','./assets/fonts/ibm-plex-mono-600-normal.woff2',
  './assets/forest-bg.jpg',
  './assets/violet-bg.jpg',
  './assets/icon-wine-512.png',
  './assets/icon-wine-maskable-512.png',
  './assets/fonts/cormorant-garamond-400-normal.woff2'];

// Install: pre-cache the app shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: drop old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network-only hosts: Firebase auth / Firestore must never be cached.
const BYPASS = ['identitytoolkit', 'googleapis.com', 'firebaseio.com', 'firestore', 'gstatic.com', 'api.github.com'];

self.addEventListener('fetch', e => {
  const url = e.request.url;
  if (BYPASS.some(h => url.includes(h))) {
    e.respondWith(fetch(e.request).catch(() => new Response('', { status: 503 })));
    return;
  }
  // Network-first for the HTML shell so a new deploy always wins; cache is the offline fallback.
  if (e.request.mode === 'navigate' || url.endsWith('/index.html') || url.endsWith('/')) {
    e.respondWith(
      fetch(e.request)
        .then(res => { const c = res.clone(); caches.open(CACHE).then(x => x.put('./index.html', c)); return res; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }
  // Cache-first for static assets (icons, manifest, fonts).
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      if (res.ok) { const clone = res.clone(); caches.open(CACHE).then(c => c.put(e.request, clone)); }
      return res;
    }))
  );
});
