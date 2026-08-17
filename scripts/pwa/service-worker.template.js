const SHELL_CACHE = '__SHELL_CACHE__'
const DATA_CACHE = 'ad-astra-data-v1'
const PRECACHE = __PRECACHE__

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) cache.put(request, response.clone())
  return response
}

async function networkFirst(request, cacheName, fallback) {
  const cache = await caches.open(cacheName)
  try {
    const response = await fetch(request)
    if (response.ok) cache.put(request, response.clone())
    return response
  } catch {
    return (await cache.match(request)) || fallback
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith('ad-astra-shell-') && key !== SHELL_CACHE)
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)
  if (url.origin !== self.location.origin || request.method !== 'GET') return

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, SHELL_CACHE, caches.match('/index.html')))
    return
  }

  if (url.pathname.endsWith('/manifest.json') && url.pathname.startsWith('/data/')) {
    event.respondWith(networkFirst(request, DATA_CACHE, caches.match(request)))
    return
  }

  if (url.pathname.startsWith('/data/')) {
    event.respondWith(cacheFirst(request, DATA_CACHE))
    return
  }

  if (url.pathname.startsWith('/assets/') || ['script', 'style', 'font', 'image'].includes(request.destination)) {
    event.respondWith(cacheFirst(request, SHELL_CACHE))
  }
})
