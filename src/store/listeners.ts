import { isAnyOf } from '@reduxjs/toolkit'
import { onAuthChange, toAuthUser } from '../services/authService'
import { savePreferences } from '../storage/preferencesStorage'
import { authChanged } from './authSlice'
import { startAppListening } from './listenerMiddleware'
import {
  languageChanged,
  selectResolvedTheme,
  systemThemeChanged,
  themeChanged,
} from './preferencesSlice'
import type { AppDispatch, RootState } from './store'

/** Puts preferences into the DOM: data-theme drives every colour token, lang drives fonts/a11y. */
function applyToDocument(state: RootState) {
  const root = document.documentElement
  const theme = selectResolvedTheme(state)
  root.dataset.theme = theme
  root.lang = state.preferences.language
  // The browser UI (mobile address bar) follows the page background.
  const bg = getComputedStyle(root).getPropertyValue('--bg').trim()
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg)
}

/**
 * Side effects of preference changes live here, not in reducers or components:
 * reducers must stay pure, and components shouldn't each remember to save.
 */
export function registerPreferenceListeners(getState: () => RootState) {
  startAppListening({
    matcher: isAnyOf(themeChanged, languageChanged),
    effect: (_action, api) => {
      const { theme, language } = api.getState().preferences
      savePreferences({ theme, language })
    },
  })

  startAppListening({
    matcher: isAnyOf(themeChanged, systemThemeChanged, languageChanged),
    effect: (_action, api) => applyToDocument(api.getState()),
  })

  applyToDocument(getState())
}

/**
 * Bridges Firebase Auth (an external system with its own event stream) into Redux.
 * Subscribed once for the app's lifetime, so there is nothing to unsubscribe.
 * Until the first callback, auth.status stays 'loading' and protected routes wait.
 */
export function startAuthSync(dispatch: AppDispatch) {
  onAuthChange((user) => {
    dispatch(authChanged(user ? toAuthUser(user) : null))
  })
}
