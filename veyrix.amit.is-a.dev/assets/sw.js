const CACHE_NAME = 'veyrix-ide-v1';
const ASSETS = [
    '../index.html',
    './manifest.json',
    './veyrix.svg',
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/ace/1.32.6/ace.js',
    'https://cdnjs.cloudflare.com/ajax/libs/ace/1.32.6/ext-beautify.js',
    'https://cdnjs.cloudflare.com/ajax/libs/lz-string/1.5.0/lz-string.min.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', event => {
    // Exclude Firebase Firestore/Auth network calls from caching to ensure live syncing works
    if (event.request.url.includes('firestore.googleapis.com') || 
        event.request.url.includes('identitytoolkit.googleapis.com')) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request).catch(() => {
                if (event.request.mode === 'navigate') {
                    return caches.match('../index.html');
                }
            });
        })
    );
});