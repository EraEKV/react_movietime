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
