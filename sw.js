const CACHE_NAME = 'pos-v33';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/billing.html',
    '/inventory.html',
    '/purchase.html',
    '/sales.html',
    '/reports.html',
    '/returns.html',
    '/payroll.html',
    '/settings.html',
    '/ar.html',
    '/css/style.css',
    '/js/app.js',
    '/js/inventory.js',
    '/js/purchase.js',
    '/js/sales.js',
    '/js/reports.js',
    '/js/settings.js',
    '/js/analytics.js',
    '/js/api.js',
    '/js/ar.js',
    '/js/cashier.js',
    '/js/notifications.js',
    '/js/theme.js',
    '/js/sidebar.js',
    '/js/sidebar-brand.js',
    '/js/payroll.js',
    '/js/sw-register.js',
    '/manifest.json',
    '/assets/icon-192.png',
    '/assets/icon-512.png',
    'https://cdn.jsdelivr.net/npm/chart.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
    // Activate immediately without waiting for old tabs to close
    self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
    // Never cache or intercept dynamic backend API requests
    if (event.request.url.includes('/api/')) {
        return;
    }

    // Network-first strategy: try network, fall back to cache
    // This prevents stale cached pages from causing "files missing" errors
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Clone and cache the fresh response
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseClone);
                });
                return response;
            })
            .catch(() => {
                // Network failed, try cache (offline fallback)
                return caches.match(event.request);
            })
    );
});

self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    // Take control of all open tabs immediately
    return self.clients.claim();
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
