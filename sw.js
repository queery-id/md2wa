/**
 * Service Worker for MD2WA
 * Enables offline functionality
 * Deployed at: benkdash.my.id/cleaner/
 */

const CACHE_NAME = 'md2wa-v4';
const BASE_PATH = '/cleaner';
const ASSETS = [
    `${BASE_PATH}/`,
    `${BASE_PATH}/index.html`,
    `${BASE_PATH}/style.css`,
    `${BASE_PATH}/app.js`,
    `${BASE_PATH}/manifest.json`,
    `${BASE_PATH}/icons/icon-192.png`,
    `${BASE_PATH}/icons/icon-512.png`
];

// Install event - cache assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
            .catch(() => {
                // Fallback for navigation requests
                if (event.request.mode === 'navigate') {
                    return caches.match(`${BASE_PATH}/index.html`);
                }
            })
    );
});


