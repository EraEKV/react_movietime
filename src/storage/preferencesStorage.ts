import type { Language, Preferences, ThemePreference } from '../types/preferences'

// index.html reads the same key before the first paint — keep both in sync.
export const PREFERENCES_KEY = 'movietime.preferences.v1'

export const DEFAULT_PREFERENCES: Preferences = { theme: 'system', language: 'en' }

const THEMES: readonly ThemePreference[] = ['light', 'dark', 'system']
const LANGUAGES: readonly Language[] = ['en', 'ru', 'kk']

export const isTheme = (value: unknown): value is ThemePreference =>
  THEMES.some((theme) => theme === value)
export const isLanguage = (value: unknown): value is Language =>
  LANGUAGES.some((lang) => lang === value)

/** Reads saved preferences; unknown or corrupted values fall back to the defaults one by one. */
export function loadPreferences(): Preferences {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(PREFERENCES_KEY) ?? '{}')
    if (typeof parsed !== 'object' || parsed === null) return DEFAULT_PREFERENCES
    return {
      theme: 'theme' in parsed && isTheme(parsed.theme) ? parsed.theme : DEFAULT_PREFERENCES.theme,
      language:
        'language' in parsed && isLanguage(parsed.language)
          ? parsed.language
          : DEFAULT_PREFERENCES.language,
    }
  } catch {
    return DEFAULT_PREFERENCES
  }
}

export function savePreferences(preferences: Preferences): void {
  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences))
  } catch {
    // Storage disabled (private mode): the choice still applies for this session.
  }
}
