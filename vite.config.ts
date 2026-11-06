import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
