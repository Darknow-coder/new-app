// Offline-first service worker. Bump VERSION on every release so clients pick up new files.
const VERSION = 'marbl-v3.2.0';
const ASSETS = [
  './',
  'index.html',
  'css/style.css',
  'js/main.js',
  'js/engine.js',
  'js/daily.js',
  'js/storage.js',
  'js/audio.js',
  'js/i18n.js',
  'js/tutorial.js',
  'js/confetti.js',
  'js/levels.js',
  'js/fx.js',
  'js/chests.js',
  'js/skins.js',
  'js/levels-data.js',
  'fonts/fredoka-latin.woff2',
  'fonts/fredoka-latin-ext.woff2',
  'js/progress.js',
  'js/map.js',
  'js/ui/collection.js',
  'js/ui/common.js',
  'js/ui/core.js',
  'js/ui/editor.js',
  'js/ui/archive.js',
  'js/solver-worker.js',
  'js/ui/game.js',
  'js/ui/home.js',
  'js/ui/input.js',
  'js/ui/mapview.js',
  'js/ui/progressui.js',
  'js/ui/result.js',
  'js/ui/settings.js',
  'js/ui/shop.js',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Stale-while-revalidate: instant from cache, refreshed in the background.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const cached = await cache.match(req, { ignoreSearch: true });
      const network = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
