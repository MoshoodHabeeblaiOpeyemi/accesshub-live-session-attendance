// 📦 THE CACHE CONFIGURATION
const CACHE_NAME = 'accesshub-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/admin.html',
  '/style.css',
  '/student.js',
  '/admin.js',
  '/IMG-20260824-WA0035.jpg'
];

// 1. INSTALL EVENT: Cache all core app assets 📥
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 2. ACTIVATE EVENT: Clean up old stale caches 🧹
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. FETCH EVENT: Serve from cache first, fallback to network 🌐
self.addEventListener('fetch', (event) => {
  // Let Firebase requests go straight to the network (never cache live database calls!) 🚫🔥
  if (event.request.url.includes('firestore.googleapis.com') || event.request.url.includes('firebase')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});