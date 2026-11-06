import type { Language } from '../types/preferences'

interface LanguageInfo {
  value: Language
  /** Each language is named in itself, so a person who can't read the current one finds theirs. */
  label: string
  /** Short label for tight spots (the header menu button). */
  short: string
  /** TMDB wants a region too: `language=ru-RU`. */
  tmdb: string
}

export const LANGUAGES: readonly LanguageInfo[] = [
  { value: 'en', label: 'English', short: 'EN', tmdb: 'en-US' },
  { value: 'ru', label: 'Русский', short: 'RU', tmdb: 'ru-RU' },
  { value: 'kk', label: 'Қазақша', short: 'KZ', tmdb: 'kk-KZ' },
]

export function languageInfo(language: Language): LanguageInfo {
  return LANGUAGES.find((item) => item.value === language) ?? LANGUAGES[0]!
}
