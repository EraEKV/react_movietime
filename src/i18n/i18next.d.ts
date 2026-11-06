import 'i18next'
import type auth from './locales/en/auth.json'
import type catalog from './locales/en/catalog.json'
import type common from './locales/en/common.json'
import type home from './locales/en/home.json'

// English dictionaries describe the shape: t('nav.home') is type-checked, a typo fails the build.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: {
      common: typeof common
      auth: typeof auth
      catalog: typeof catalog
      home: typeof home
    }
  }
}
