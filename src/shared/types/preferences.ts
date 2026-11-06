export type ThemePreference = 'light' | 'dark' | 'system'
/** The theme actually applied to the page after resolving 'system'. */
export type ResolvedTheme = 'light' | 'dark'
export type Language = 'en' | 'ru' | 'kk'

export interface Preferences {
  theme: ThemePreference
  language: Language
}
