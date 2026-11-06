import { useTranslation } from 'react-i18next'
import { languageInfo } from '../shared/i18n/languages'
import type { Language } from '../shared/types/preferences'

/**
 * TMDB's code for the interface language ("ru-RU"). Hooks put it into their request key, so
 * switching the language changes the key and the data is fetched again in that language.
 * Read from i18next, not the store: it changes once the dictionaries are loaded, together
 * with the texts around the data.
 */
export function useTmdbLanguage(): string {
  const { i18n } = useTranslation()
  return languageInfo(i18n.language as Language).tmdb
}
