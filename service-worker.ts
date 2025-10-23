
const CACHE_NAME = 'offline-music-player-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  // Note: The dynamically imported modules from the CDN will be cached by the browser,
  // and the service worker will cache the main page that references them.
  // We don't list them here as they are cross-origin.
];

// Install event: cache all static assets
self.addEventListener('install', (event) => {
  // Fix: The 'install' event listener receives an ExtendableEvent. Cast event to access 'waitUntil'.
  (event as ExtendableEvent).waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  (self as any).skipWaiting();
});

// Activate event: clean up old caches
self.addEventListener('activate', (event) => {
  // Fix: The 'activate' event listener receives an ExtendableEvent. Cast event to access 'waitUntil'.
  (event as ExtendableEvent).waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  (self as any).clients.claim();
});

// Fetch event: serve assets from cache first
self.addEventListener('fetch', (event) => {
  // Fix: The 'fetch' event listener receives a FetchEvent. Cast event to access 'request' and 'respondWith'.
  const fetchEvent = event as FetchEvent;
  // We only want to handle navigation requests for the app shell
  if (fetchEvent.request.mode === 'navigate') {
    fetchEvent.respondWith(
      caches.match(fetchEvent.request).then((response) => {
        return response || fetch(fetchEvent.request);
      }).catch(() => {
        // If the network is unavailable and the page is not in the cache,
        // serve the main index.html as a fallback.
        return caches.match('/index.html');
      })
    );
  }
});
