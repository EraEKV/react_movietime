import type { Language, ThemePreference } from './preferences'

/** Sign-in methods Movietime offers; Firebase calls them provider ids. */
export type AuthProvider = 'password' | 'google.com'

/**
 * The part of a Firebase `User` the app needs. A plain object, so it can live in Redux:
 * the real `User` has methods and internal state and isn't serializable.
 */
export interface AuthUser {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  emailVerified: boolean
  providers: string[]
}

export type AuthStatus = 'loading' | 'authenticated' | 'guest'

/** An auth failure the UI can show: `code` decides where (field or banner), `message` what. */
export interface AuthError {
  code: string
  message: string
}

/** `users/{uid}` as the app reads it. Timestamps become ISO strings (or null while pending). */
export interface UserProfile {
  displayName: string
  email: string
  photoURL: string | null
  providers: string[]
  settings: { theme: ThemePreference; language: Language }
  createdAt: string | null
  updatedAt: string | null
}
