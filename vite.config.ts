import { promises as dnsPromises } from 'node:dns'
import { lookup as systemLookup } from 'node:dns'
import { Agent } from 'node:https'
import type { LookupFunction } from 'node:net'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type ProxyOptions } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import devApi from './vite.dev-api.ts'

// Some networks (corporate DNS, ISPs) answer api.themoviedb.org with 127.0.0.1 or nothing.
// The dev proxy asks public resolvers first and only then the system one.
const publicDns = new dnsPromises.Resolver()
publicDns.setServers(['1.1.1.1', '8.8.8.8'])
const lookup: LookupFunction = (hostname, options, callback) => {
  publicDns.resolve4(hostname).then(
    (addresses) =>
      options.all
        ? callback(
            null,
            addresses.map((address) => ({ address, family: 4 })),
          )
        : callback(null, addresses[0] ?? '', 4),
    () => systemLookup(hostname, options, callback),
  )
}

/** `/api/tmdb/*` → TMDB with the token added here, the same contract as api/tmdb on Vercel. */
function tmdbProxy(token: string | undefined): Record<string, ProxyOptions> {
  return {
    '/api/tmdb': {
      target: 'https://api.themoviedb.org',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api\/tmdb/, '/3'),
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      agent: new Agent({ lookup }),
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const token = env.TMDB_TOKEN ?? env.VITE_TMDB_TOKEN
  return {
    server: { proxy: tmdbProxy(token) },
    preview: { proxy: tmdbProxy(token) },
    plugins: [
      react(),
      devApi(mode),
      VitePWA({
        // Own worker (src/sw.ts) with the precache list injected into it at build time.
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.ts',
        // The new worker waits until the user accepts the update prompt.
        registerType: 'prompt',
        injectRegister: false,
        injectManifest: {
          // The install downloads everything listed here at once, and a full list was 222
          // requests per install: crawlers and every new visitor paid it, and so did every
          // returning one after a deploy. So only the shell is listed: the page, the entry
          // script and stylesheet, the icons and the `common` dictionary of each language.
          // Chunks and the other dictionaries are cached on first use, see src/sw.ts.
          globPatterns: [
            'index.html',
            'favicon.svg',
            'icons/*.png',
            'assets/index-*.{js,css}',
            'locales/*/common.json',
          ],
          // Everything the app loads at start fits; the Firestore chunk (~540 kB) must too.
          maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
        },
        manifest: {
          name: 'Avleron',
          short_name: 'Avleron',
          description:
            'Discover movies and series, track what you watch and plan watching together.',
          lang: 'en',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait-primary',
          theme_color: '#0b0c0f',
          background_color: '#0b0c0f',
          categories: ['entertainment'],
          icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            {
              src: '/icons/maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        devOptions: { enabled: false },
      }),
    ],
    // Dictionaries in public/locales keep their file names; this id goes into their URLs.
    define: { __BUILD_ID__: JSON.stringify(Date.now().toString(36)) },
    build: {
      // The main chunk is ~420 kB (with the Redux library slice). The only chunk above Vite's default 500 kB is the Firestore SDK
      // (~535 kB), and it is not part of the first load: it comes with lazy pages and the sign-in
      // profile sync (dynamic imports). Splitting the SDK by hand with codeSplitting groups
      // builds, but breaks its module init order at runtime, so the limit is raised instead.
      chunkSizeWarningLimit: 600,
      rolldownOptions: {
        output: {
          codeSplitting: {
            // React Router is needed on first load either way; as its own chunk it stays
            // cached across app deploys, and the bundler's automatic grouping can't fold it
            // back into the main chunk when the set of lazy pages changes.
            groups: [
              { name: 'router', test: /node_modules[\\/]react-router/, priority: 20 },
              // Modules shared by several pages would each become a file of a few hundred
              // bytes (a page view was ~80 requests); merge them into a few bigger ones.
              {
                name: 'shared',
                test: /[\\/]src[\\/]/,
                minShareCount: 2,
                minSize: 30_000,
                priority: 5,
              },
            ],
          },
        },
      },
    },
  }
})
