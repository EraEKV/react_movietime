/// <reference lib="webworker" />
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies'

declare const self: ServiceWorkerGlobalScope

const DAY = 24 * 60 * 60

// Precache: the build's JS/CSS/HTML, icons and /locales/* dictionaries (they live in public/,
// so the plugin lists them too). Dictionaries are requested as /locales/xx/ns.json?v=<build>:
// the `v` parameter is ignored when matching, the precache revision already tracks the build.
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST, { ignoreURLParametersMatching: [/^v$/, /^utm_/, /^fbclid$/] })

// App shell: any navigation is answered with the cached index.html (the router renders the
// page). If even that is unavailable the browser gets /offline from the precache.
const shell = createHandlerBoundToURL('/index.html')
registerRoute(
  new NavigationRoute(
    async (options) => {
      try {
        return await shell(options)
      } catch {
        // The shell itself is missing (e.g. the precache was evicted): send the visitor to the
        // offline route; once the shell is back the router renders OfflinePage there.
        return new URL(options.request.url).pathname === '/offline'
          ? Response.error()
          : Response.redirect('/offline')
      }
    },
    // Firebase auth helper pages and static files with an extension are not routes.
    { denylist: [/^\/__\//, /\/[^/?]+\.[^/]+$/] },
  ),
)

// What the precache leaves out is stored the first time it is used. Both URL kinds are
// versioned (hashed file names; dictionaries carry ?v=<build>), so cache-first never serves
// an outdated file, and old entries just age out.
registerRoute(
  ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/assets/'),
  new CacheFirst({
    cacheName: 'app-chunks',
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 120, maxAgeSeconds: 30 * DAY, purgeOnQuotaError: true }),
    ],
  }),
)
registerRoute(
  ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/locales/'),
  new CacheFirst({
    cacheName: 'dictionaries',
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * DAY, purgeOnQuotaError: true }),
    ],
  }),
)

// TMDB API: the network wins, so data stays fresh; when it fails the last answer (up to a
// day old) is served. The timeout makes a flaky connection fall back quickly.
registerRoute(
  ({ url }) => url.hostname === 'api.themoviedb.org',
  new NetworkFirst({
    cacheName: 'tmdb-api',
    networkTimeoutSeconds: 5,
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: DAY, purgeOnQuotaError: true }),
    ],
  }),
)

// Posters and backdrops never change under the same URL: cache first. <img> requests are
// no-cors, so the responses are opaque (status 0) and are accepted as such.
registerRoute(
  ({ url }) => url.hostname === 'image.tmdb.org',
  new CacheFirst({
    cacheName: 'tmdb-images',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 300, maxAgeSeconds: 30 * DAY, purgeOnQuotaError: true }),
    ],
  }),
)

// Google Fonts: the stylesheet changes rarely, the font files never.
registerRoute(
  ({ url }) => url.hostname === 'fonts.googleapis.com',
  new StaleWhileRevalidate({ cacheName: 'google-fonts-css' }),
)
registerRoute(
  ({ url }) => url.hostname === 'fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-files',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 365 * DAY }),
    ],
  }),
)

// The update prompt sends this message; until then the new worker waits, so a reload never
// swaps assets under a page the user is working in.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') void self.skipWaiting()
})
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

// Web Push (api/push-notify). The payload is JSON: { title, body, url, tag }. `tag` makes a
// newer notice about the same list replace the older one instead of stacking.
interface PushPayload {
  title?: string
  body?: string
  url?: string
  tag?: string
}

self.addEventListener('push', (event) => {
  let payload: PushPayload
  try {
    payload = (event.data?.json() ?? {}) as PushPayload
  } catch {
    payload = { title: event.data?.text() }
  }
  event.waitUntil(
    self.registration.showNotification(payload.title || 'Movietime', {
      body: payload.body,
      tag: payload.tag,
      icon: '/icons/icon-192.png',
      data: { url: payload.url || '/' },
    }),
  )
})

// A tap opens the list: reuse an open window of the app when there is one.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL(
    (event.notification.data as { url?: string })?.url || '/',
    self.location.origin,
  )
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const open = windows.find((w) => new URL(w.url).origin === target.origin)
      if (open) {
        await open.focus()
        if ('navigate' in open) await open.navigate(target.href)
      } else {
        await self.clients.openWindow(target.href)
      }
    })(),
  )
})
