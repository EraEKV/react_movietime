import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { loadPreferences } from '../storage/preferencesStorage'
import type {
  Language,
  Preferences,
  ResolvedTheme,
  ThemePreference,
} from '../shared/types/preferences'

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
    /** The account's settings arrived (another device changed them, or a fresh sign-in). */
    preferencesSynced(state, action: PayloadAction<Preferences>) {
      state.theme = action.payload.theme
      state.language = action.payload.language
    },
  },
  selectors: {
    selectThemePreference: (state) => state.theme,
    selectLanguage: (state) => state.language,
    selectResolvedTheme: (state): ResolvedTheme =>
      state.theme === 'system' ? state.systemTheme : state.theme,
  },
})

export const { themeChanged, systemThemeChanged, languageChanged, preferencesSynced } =
  preferencesSlice.actions
export const { selectThemePreference, selectLanguage, selectResolvedTheme } =
  preferencesSlice.selectors
export default preferencesSlice
