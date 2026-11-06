import i18n, { type BackendModule } from 'i18next'
import { initReactI18next } from 'react-i18next'
import type { Language } from '../types/preferences'

/**
 * Dictionaries are split by feature: locales/<language>/<namespace>.json. Vite turns every
 * file into its own small chunk (hashed name → safe to cache), and nothing is bundled up front:
 * - the first load brings only `common` of the current language;
 * - a page asks for its namespace (`useTranslation('planner')`) and suspends until it arrives,
 *   so the Suspense boundary in Layout shows the page skeleton meanwhile;
 * - changeLanguage() fetches the new language for every namespace already in use before it
 *   switches, so the whole screen changes at once.
 */
const files = import.meta.glob<{ default: Record<string, unknown> }>('./locales/*/*.json')

// A tiny i18next backend: "give me <namespace> in <language>" → dynamic import of that file.
const lazyBackend: BackendModule = {
  type: 'backend',
  init() {},
  read(language, namespace, callback) {
    const load = files[`./locales/${language}/${namespace}.json`]
    if (!load) return callback(new Error(`No dictionary ${language}/${namespace}`), null)
    load().then(
      (module) => callback(null, module.default),
      (error: unknown) => callback(error instanceof Error ? error : new Error(String(error)), null),
    )
  },
}

i18n.on('languageChanged', (language) => {
  document.documentElement.lang = language
})

/** Called once before the first render (main.tsx), so the app never shows raw keys. */
export function initI18n(language: Language) {
  return i18n
    .use(lazyBackend)
    .use(initReactI18next)
    .init({
      lng: language,
      ns: ['common'],
      defaultNS: 'common',
      // No fallback language: it would download English as well on every first load.
      // `npm run check:locales` makes sure every dictionary has every key instead.
      fallbackLng: false,
      interpolation: { escapeValue: false }, // React escapes already.
    })
}

/**
 * Switches the interface language. A dictionary that fails to load (offline, never cached)
 * makes i18next keep the current texts; the choice is still saved and applies next time.
 */
export function setLanguage(language: Language) {
  if (i18n.language !== language) void i18n.changeLanguage(language)
}

/** The current language for Intl formatters: 'en' | 'ru' | 'kk' are valid BCP 47 tags. */
export const currentLocale = () => i18n.language || 'en'

export default i18n
