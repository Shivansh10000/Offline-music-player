/// <reference lib="webworker" />

// Fix: Add a type declaration for `self` to ensure TypeScript recognizes it as a `ServiceWorkerGlobalScope`.
declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = 'offline-music-player-v3'; // Bump version to force update and clear old cache
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/index.tsx', // The main entry point script
  // All external CDN dependencies
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/jsmediatags/3.9.5/jsmediatags.min.js',
  'https://aistudiocdn.com/react@^19.2.0',
  'https://aistudiocdn.com/react-dom@^19.2.0',
  'https://aistudiocdn.com/idb@^8.0.3',
  'https://aistudiocdn.com/webworker@^0.8.4',
  // App icons from the manifest
  'https://www.gstatic.com/images/branding/product/1x/drive_2020q4_48dp.png',
  'https://www.gstatic.com/images/branding/product/1x/drive_2020q4_96dp.png',
  'https://www.gstatic.com/images/branding/product/1x/drive_2020q4_192dp.png',
  'https://www.gstatic.com/images/branding/product/1x/drive_2020q4_512dp.png',
];

// Install the service worker and cache all application assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache and caching all app assets for offline use.');
        // Use a request with no-cache to ensure we get the latest from the network on install.
        const requests = urlsToCache.map(url => new Request(url, { cache: 'no-cache' }));
        return cache.addAll(requests);
      })
      .catch(error => {
        console.error('Failed to cache assets during install:', error);
      })
  );
  self.skipWaiting();
});

// Clean up old caches on activation
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
  );
  self.clients.claim();
});

// Serve content from cache first. If not found, the request will fail,
// enforcing a pure offline experience after installation.
self.addEventListener('fetch', (event) => {
  // We only handle GET requests.
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // If a cached response is found, return it. This is the primary path for offline use.
        if (cachedResponse) {
          return cachedResponse;
        }

        // If not in cache, this will now fail when offline, as we are not falling back to network.
        // During the very first load (while online), this allows the browser to fetch assets
        // that might not have been part of the initial cache list, and we cache them for next time.
        return fetch(event.request).then((networkResponse) => {
          // Check if we received a valid response.
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }

          // Clone the response because it's a one-time use stream.
          const responseToCache = networkResponse.clone();

          caches.open(CACHE_NAME).then((cache) => {
            // Cache the new response for future offline use.
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        });
      })
  );
});