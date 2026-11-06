import i18n, { type BackendModule, type CustomTypeOptions, type ParseKeys } from 'i18next'
import { initReactI18next } from 'react-i18next'
import type { Language } from '../types/preferences'
import { formatNumberWith } from './intl'

/**
 * Dictionaries are plain JSON files in `public/locales/<language>/<namespace>.json`, split by
 * feature and fetched over HTTP, not bundled:
 * - the first load fetches only `common` of the current language (plus the page's namespace);
 * - a page asks for its namespace (`useTranslation('planner')`) and suspends until it arrives,
 *   so the Suspense boundary in Layout shows the page skeleton meanwhile;
 * - changeLanguage() fetches the new language for every namespace already in use before it
 *   switches, so the whole screen changes at once.
 * Files in `public/` keep their names, so the URL carries the build id: a new deploy changes it
 * and nobody keeps an old dictionary from the browser cache.
 */
const lazyBackend: BackendModule = {
  type: 'backend',
  init() {},
  read(language, namespace, callback) {
    fetch(`/locales/${language}/${namespace}.json?v=${__BUILD_ID__}`)
      .then((response) => {
        if (!response.ok) throw new Error(`Dictionary ${language}/${namespace}: ${response.status}`)
        return response.json() as Promise<Record<string, unknown>>
      })
      .then(
        (resources) => callback(null, resources),
        (error: unknown) =>
          callback(error instanceof Error ? error : new Error(String(error)), null),
      )
  },
}

i18n.on('languageChanged', (language) => {
  document.documentElement.lang = language
})

/**
 * Called once before the first render (main.tsx), so the app never shows raw keys.
 * `preload` adds the namespace of the page being opened (Home: 'home'), so it arrives in
 * parallel with `common` instead of after the first render suspends on it.
 */
export async function initI18n(language: Language, preload: string[] = []) {
  await i18n
    .use(lazyBackend)
    .use(initReactI18next)
    .init({
      lng: language,
      ns: ['common', ...preload],
      defaultNS: 'common',
      // No fallback language: it would download English as well on every first load.
      // `npm run check:locales` makes sure every dictionary has every key instead.
      fallbackLng: false,
      interpolation: { escapeValue: false }, // React escapes already.
    })
  // `{{count, number}}` in dictionaries: same Kazakh safety net as the app's own formatters.
  i18n.services.formatter?.add('number', (value: number, lng, options) =>
    formatNumberWith(value, lng ?? 'en', options as Intl.NumberFormatOptions),
  )
}

/**
 * Switches the interface language. A dictionary that fails to load (offline, never cached)
 * makes i18next keep the current texts; the choice is still saved and applies next time.
 */
export function setLanguage(language: Language) {
  if (i18n.language !== language) void i18n.changeLanguage(language)
}

/** A key of the common dictionary ('nav.home') or of another one with its prefix ('library:sort.title'). */
type Resources = CustomTypeOptions['resources']
type PrefixedKey = { [N in keyof Resources]: `${N}:${ParseKeys<N>}` }[keyof Resources]
export type TranslationKey = ParseKeys<'common'> | PrefixedKey

/**
 * A select option whose label is looked up when it is read, not when the module loads:
 * option lists stay plain constants, and every render shows them in the current language.
 */
export function translatedOption<T extends string>(value: T, key: TranslationKey) {
  return {
    value,
    get label(): string {
      return i18n.t(key)
    },
  }
}

/** The current language for Intl formatters: 'en' | 'ru' | 'kk' are valid BCP 47 tags. */
export const currentLocale = () => i18n.language || 'en'

export default i18n
