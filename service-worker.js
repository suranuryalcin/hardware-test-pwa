/* =========================================================
   Service Worker — Donanım Test PWA
   Strateji: Cache First (statik varlıklar için)
   ========================================================= */

const CACHE_NAME = 'hw-test-v1.0.0';
const OFFLINE_URL = './index.html';

// Cache'lenecek tüm varlıklar (pre-cache)
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',

  // Stiller
  './css/style.css',
  './css/test-modules.css',

  // Ana JS
  './js/app.js',
  './js/pwa.js',

  // Test modülleri
  './js/tests/screen-color.js',
  './js/tests/touch.js',
  './js/tests/speaker.js',
  './js/tests/microphone.js',
  './js/tests/vibration.js',
  './js/tests/network.js',
'./js/tests/location.js',
  // Test sayfaları
  './pages/color.html',
  './pages/touch.html',
  './pages/speaker.html',
  './pages/microphone.html',
  './pages/vibration.html',
  './pages/network.html',
'./pages/location.html',
  // İkonlar
  './icons/cark.png',
  
];

/* ---------- INSTALL ---------- */
self.addEventListener('install', (event) => {
  console.log('[SW] Install ediliyor...');

  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      // Tek tek ekle — biri başarısız olursa diğerleri devam etsin
      await Promise.allSettled(
        PRECACHE_ASSETS.map(async (asset) => {
          try {
            await cache.add(new Request(asset, { cache: 'reload' }));
            console.log(`[SW] ✓ Cache'lendi: ${asset}`);
          } catch (err) {
            console.warn(`[SW] ✗ Cache'lenemedi: ${asset}`, err);
          }
        })
      );

      // Yeni SW'yi hemen aktif et
      await self.skipWaiting();
    })()
  );
});

/* ---------- ACTIVATE ---------- */
self.addEventListener('activate', (event) => {
  console.log('[SW] Aktif ediliyor...');

  event.waitUntil(
    (async () => {
      // Eski cache'leri temizle
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log(`[SW] Eski cache silindi: ${name}`);
            return caches.delete(name);
          })
      );

      // Tüm sekmeleri hemen kontrol altına al
      await self.clients.claim();
    })()
  );
});

/* ---------- FETCH ---------- */
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Sadece GET isteklerini ele al
  if (request.method !== 'GET') return;

  // Farklı origin'leri atla (analytics, CDN vs.)
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigasyon istekleri (HTML sayfaları) → Network First
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request);
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, networkResponse.clone());
          return networkResponse;
        } catch (err) {
          const cachedResponse = await caches.match(request);
          return cachedResponse || caches.match(OFFLINE_URL);
        }
      })()
    );
    return;
  }

  // Diğer statik varlıklar → Cache First
  event.respondWith(
    (async () => {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) return cachedResponse;

      try {
        const networkResponse = await fetch(request);
        // Başarılı yanıtları cache'e ekle
        if (networkResponse && networkResponse.status === 200) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      } catch (err) {
        console.warn('[SW] Fetch başarısız:', request.url);
        // Görsel için placeholder, diğerleri için boş yanıt
        return new Response('', { status: 408, statusText: 'Offline' });
      }
    })()
  );
});

/* ---------- MESSAGE ---------- */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});