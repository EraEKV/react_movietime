import 'i18next'
import type auth from './locales/en/auth.json'
import type catalog from './locales/en/catalog.json'
import type common from './locales/en/common.json'
import type home from './locales/en/home.json'
import type library from './locales/en/library.json'
import type lists from './locales/en/lists.json'
import type sharing from './locales/en/sharing.json'

// English dictionaries describe the shape: t('nav.home') is type-checked, a typo fails the build.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: {
      common: typeof common
      auth: typeof auth
      catalog: typeof catalog
      home: typeof home
      library: typeof library
      lists: typeof lists
      sharing: typeof sharing
    }
  }
}
