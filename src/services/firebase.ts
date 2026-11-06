import { initializeApp, type FirebaseOptions } from 'firebase/app'
import { getAuth } from 'firebase/auth'

const env = import.meta.env

// Vite inlines these at build time. They are not secrets: the web config is public by design,
// access is controlled by Firestore security rules and Authorized domains.
const required = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
}

const missing = Object.entries(required)
  .filter(([, value]) => !value)
  .map(([key]) => key)

if (missing.length > 0) {
  // Fail loudly at startup instead of with a cryptic auth error later.
  throw new Error(
    `Firebase config is missing: ${missing.join(', ')}. ` +
      'Add the VITE_FIREBASE_* variables to .env.local (see docs/FIREBASE_SETUP.md).',
  )
}

const config: FirebaseOptions = { ...required, measurementId: env.VITE_FIREBASE_MEASUREMENT_ID }

export const app = initializeApp(config)

// Auth is needed on every page (header, guards), so it is part of the main bundle.
// Firestore lives in ./firestore and loads with the first module that reads data.
export const auth = getAuth(app)
