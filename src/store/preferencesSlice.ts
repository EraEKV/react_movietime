import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { loadPreferences } from '../storage/preferencesStorage'
import type { Language, Preferences, ResolvedTheme, ThemePreference } from '../types/preferences'

export interface PreferencesState extends Preferences {
  /** What the OS currently prefers; needed to resolve theme: 'system'. */
  systemTheme: ResolvedTheme
}

function readSystemTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

// Reducers stay pure: reading storage happens once here, writing it happens in listeners.ts.
const initialState: PreferencesState = { ...loadPreferences(), systemTheme: readSystemTheme() }

const preferencesSlice = createSlice({
  name: 'preferences',
  initialState,
  reducers: {
    themeChanged(state, action: PayloadAction<ThemePreference>) {
      // Immer: this "mutation" produces a new state object under the hood.
      state.theme = action.payload
    },
    systemThemeChanged(state, action: PayloadAction<ResolvedTheme>) {
      state.systemTheme = action.payload
    },
    languageChanged(state, action: PayloadAction<Language>) {
      state.language = action.payload
    },
  },
  selectors: {
    selectThemePreference: (state) => state.theme,
    selectLanguage: (state) => state.language,
    selectResolvedTheme: (state): ResolvedTheme =>
      state.theme === 'system' ? state.systemTheme : state.theme,
  },
})

export const { themeChanged, systemThemeChanged, languageChanged } = preferencesSlice.actions
export const { selectThemePreference, selectLanguage, selectResolvedTheme } =
  preferencesSlice.selectors
export default preferencesSlice
