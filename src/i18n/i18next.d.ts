import 'i18next'
import type auth from './locales/en/auth.json'
import type common from './locales/en/common.json'

// English dictionaries describe the shape: t('nav.home') is type-checked, a typo fails the build.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: {
      common: typeof common
      auth: typeof auth
    }
  }
}
