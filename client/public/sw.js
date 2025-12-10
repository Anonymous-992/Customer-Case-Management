const CACHE_NAME = 'akito-cms-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/logo.png',
  '/manifest.json'
];

/* 
 * 1. INSTALL
 * Cache critical assets to make the PWA installable and faster to load initially.
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  // Force the waiting service worker to become the active service worker.
  self.skipWaiting();
});

/*
 * 2. ACTIVATE
 * Clean up old caches so that the new service worker can take over.
 * Claim clients immediately to ensure the new logic (Network First) applies right away.
 */
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => self.clients.claim())
  );
});

/*
 * 3. FETCH
 * Strategy: 
 * - API Requests: Network Only (Never cache, always fetch fresh data)
 * - Navigation/Static: Network First (Try network, fallback to cache if offline)
 */
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // RULE 1: IGNORE API REQUESTS & NON-GET REQUESTS
  // We want real-time data from the backend. Never serve API responses from cache.
  if (url.pathname.startsWith('/api') || event.request.method !== 'GET') {
    return; // browser performs default network request
  }

  // RULE 2: NETWORK FIRST FOR EVERYTHING ELSE
  // Try to get the latest version from network. If successful, update cache.
  // If network fails (offline), fall back to cache.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Check if we received a valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Clone the response to store in cache
        const responseToCache = response.clone();

        caches.open(CACHE_NAME)
          .then((cache) => {
            cache.put(event.request, responseToCache);
          });

        return response;
      })
      .catch(() => {
        // Network failed, look in cache
        console.log('Network failed, falling back to cache for:', event.request.url);
        return caches.match(event.request);
      })
  );
});
