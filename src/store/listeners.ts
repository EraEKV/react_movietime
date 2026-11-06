import { isAnyOf, TaskAbortError } from '@reduxjs/toolkit'
import { loadAuthService } from '../services/loadAuthService'
import { setLanguage } from '../shared/i18n'
import { savePreferences } from '../storage/preferencesStorage'
import { authChanged } from './authSlice'
import { startAppListening } from './listenerMiddleware'
import {
  languageChanged,
  preferencesSynced,
  selectResolvedTheme,
  systemThemeChanged,
  themeChanged,
} from './preferencesSlice'
import type { AppDispatch, RootState } from './store'

/** Puts the theme into the DOM: data-theme drives every colour token. (<html lang> is set by i18n.) */
function applyToDocument(state: RootState) {
  const root = document.documentElement
  const theme = selectResolvedTheme(state)
  root.dataset.theme = theme
  // The browser UI (mobile address bar) follows the page background.
  const bg = getComputedStyle(root).getPropertyValue('--bg').trim()
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg)
}

/**
 * Side effects of preference changes live here, not in reducers or components:
 * reducers must stay pure, and components shouldn't each remember to save.
 *
 * Where preferences live: guests keep them in localStorage only. Signed-in users also keep
 * them in `users/{uid}.settings`, so the theme follows the account to another device.
 * localStorage stays the first-paint cache either way (index.html reads it before React).
 */
export function registerPreferenceListeners(getState: () => RootState) {
  // Every change, local or from the account, is cached on this device.
  startAppListening({
    matcher: isAnyOf(themeChanged, languageChanged, preferencesSynced),
    effect: (_action, api) => {
      const { theme, language } = api.getState().preferences
      savePreferences({ theme, language })
    },
  })

  // The interface language follows the store; i18next loads the dictionaries it needs.
  startAppListening({
    matcher: isAnyOf(languageChanged, preferencesSynced),
    effect: (_action, api) => setLanguage(api.getState().preferences.language),
  })

  startAppListening({
    matcher: isAnyOf(themeChanged, systemThemeChanged, languageChanged, preferencesSynced),
    effect: (_action, api) => applyToDocument(api.getState()),
  })

  // A choice made here goes to the account. preferencesSynced is not matched: writing back
  // what just came from the account would only echo it.
  startAppListening({
    matcher: isAnyOf(themeChanged, languageChanged),
    effect: async (_action, api) => {
      const uid = api.getState().auth.user?.uid
      if (!uid) return
      const { theme, language } = api.getState().preferences
      try {
        const { updateUserProfile } = await import('../services/profileService')
        // Offline this resolves after reconnecting; the choice already applies meanwhile.
        await updateUserProfile(uid, { settings: { theme, language } })
      } catch (error) {
        console.warn('Could not save the settings to the account', error)
      }
    },
  })

  /**
   * The account's settings, live: a change on another device (or the saved choice of an
   * account that just signed in here) applies on this one. Same lifecycle as the library
   * listener: restarts when the user changes, the finally block unsubscribes.
   * On the very first sign-in an account has no settings yet — ensureProfile() then saves
   * this device's choice, so "account wins, else local" holds without extra code here.
   */
  startAppListening({
    predicate: (_action, current, previous) =>
      current.auth.status !== 'loading' &&
      (previous.auth.status === 'loading' || current.auth.user?.uid !== previous.auth.user?.uid),
    effect: async (_action, api) => {
      api.cancelActiveListeners()
      const uid = api.getState().auth.user?.uid
      if (!uid) return // Guests stay on localStorage.

      let unsubscribe: (() => void) | undefined
      try {
        const service = await api.pause(import('../services/profileService'))
        unsubscribe = service.watchProfile(
          uid,
          (profile) => {
            const settings = profile?.settings
            const { theme, language } = api.getState().preferences
            if (settings && (settings.theme !== theme || settings.language !== language)) {
              api.dispatch(preferencesSynced(settings))
            }
          },
          (error) => console.warn('Could not read the account settings', error),
        )
        await api.condition(() => false)
      } catch (error) {
        if (!(error instanceof TaskAbortError)) console.warn('Settings sync stopped', error)
      } finally {
        unsubscribe?.()
      }
    },
  })

  applyToDocument(getState())
}

/**
 * Bridges Firebase Auth (an external system with its own event stream) into Redux.
 * Subscribed once for the app's lifetime, so there is nothing to unsubscribe.
 * Until the first callback, auth.status stays 'loading' and protected routes wait.
 */
export async function startAuthSync(dispatch: AppDispatch) {
  const { onAuthChange, toAuthUser } = await loadAuthService()
  onAuthChange((user) => {
    dispatch(authChanged(user ? toAuthUser(user) : null))
  })
}
