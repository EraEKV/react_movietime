import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Own worker (src/sw.ts) with the precache list injected into it at build time.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      // The new worker waits until the user accepts the update prompt.
      registerType: 'prompt',
      injectRegister: false,
      injectManifest: {
        // public/locales/**/*.json is copied to dist, so it is listed here and precached.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,json}'],
        // The install downloads everything listed here at once (that was 232 requests), so
        // the list is kept to what a first offline start needs: only `common` of each
        // language, and not the pages that make no sense offline (sign-up, creating a plan,
        // the dashboard…). Both are cached on first use instead, see src/sw.ts.
        globIgnores: [
          'locales/*/!(common).json',
          'assets/{About,CreatePlan,Dashboard,ListForm,LibraryEdit,Signup,VerifyEmail,Login,Settings}Page-*.{js,css}',
        ],
        // Everything the app loads at start fits; the Firestore chunk (~540 kB) must too.
        maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
      },
      manifest: {
        name: 'Avleron',
        short_name: 'Avleron',
        description: 'Discover movies and series, track what you watch and plan watching together.',
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
          groups: [{ name: 'router', test: /node_modules[\\/]react-router/ }],
        },
      },
    },
  },
})
