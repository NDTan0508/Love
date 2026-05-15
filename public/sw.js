const STATIC_CACHE = 'love-mission-static-v1'
const OFFLINE_CACHE = 'love-mission-offline-v1'
const OFFLINE_URL = '/offline'
const PRECACHE_URLS = [
  OFFLINE_URL,
  '/manifest.json',
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/maskable-icon-512.png',
  '/icons/apple-touch-icon.png'
]

const ALL_CACHES = [STATIC_CACHE, OFFLINE_CACHE]
const STATIC_EXTENSIONS = [
  '.css',
  '.js',
  '.mjs',
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.svg',
  '.ico'
]

function isSameOrigin(url) {
  return url.origin === self.location.origin
}

function isApiOrRealtimeRequest(url) {
  return url.pathname.startsWith('/api/') || url.hostname.includes('supabase.co')
}

function isStaticRequest(request, url) {
  if (!isSameOrigin(url)) return false
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) return true
  if (['script', 'style', 'font', 'image'].includes(request.destination)) return true
  return STATIC_EXTENSIONS.some((extension) => url.pathname.endsWith(extension))
}

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached

  const response = await fetch(request)
  if (response.ok) {
    const cache = await caches.open(STATIC_CACHE)
    await cache.put(request, response.clone())
  }
  return response
}

async function navigationFallback(request) {
  try {
    return await fetch(request)
  } catch {
    return (await caches.match(OFFLINE_URL)) || Response.error()
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(OFFLINE_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => undefined)
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => !ALL_CACHES.includes(key)).map((key) => caches.delete(key)))
      )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (isApiOrRealtimeRequest(url)) return

  if (request.mode === 'navigate') {
    event.respondWith(navigationFallback(request))
    return
  }

  if (isStaticRequest(request, url)) {
    event.respondWith(cacheFirst(request))
  }
})

self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload = {}
  try {
    payload = event.data.json()
  } catch {
    payload = { body: event.data.text() }
  }

  const title = payload.title || 'Love Mission'
  const options = {
    body: payload.body || 'Bạn có một nhắc nhở mới.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: payload.data || {}
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existingClient = clients.find((client) => 'focus' in client)
      if (existingClient) return existingClient.focus()
      return self.clients.openWindow(targetUrl)
    })
  )
})
