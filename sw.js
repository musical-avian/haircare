// Cache-first service worker so the app works offline in the shop.
// Bump VERSION whenever any cached file changes.
const VERSION = 'v3';
const FILES = [
  './', 'index.html', 'app.js', 'match.js', 'ingredients.json', 'alternatives.json', 'manifest.json', 'icon.svg', 'icon-192.png', 'icon-512.png',
  'vendor/tesseract.min.js', 'vendor/worker.min.js', 'vendor/lang/eng.traineddata.gz',
  'vendor/core/tesseract-core-lstm.wasm.js', 'vendor/core/tesseract-core-simd-lstm.wasm.js',
];

self.addEventListener('install', (e) => e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES))));
self.addEventListener('activate', (e) =>
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k))))));
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((r) => r || fetch(e.request)));
});
