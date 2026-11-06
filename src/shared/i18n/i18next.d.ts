import 'i18next'
import type auth from '../../../public/locales/en/auth.json'
import type catalog from '../../../public/locales/en/catalog.json'
import type common from '../../../public/locales/en/common.json'
import type dashboard from '../../../public/locales/en/dashboard.json'
import type home from '../../../public/locales/en/home.json'
import type library from '../../../public/locales/en/library.json'
import type lists from '../../../public/locales/en/lists.json'
import type notifications from '../../../public/locales/en/notifications.json'
import type planner from '../../../public/locales/en/planner.json'
import type profile from '../../../public/locales/en/profile.json'
import type sharing from '../../../public/locales/en/sharing.json'

// English dictionaries describe the shape: t('nav.home') is type-checked, a typo fails the build.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: {
      common: typeof common
      auth: typeof auth
      catalog: typeof catalog
      dashboard: typeof dashboard
      home: typeof home
      library: typeof library
      lists: typeof lists
      notifications: typeof notifications
      planner: typeof planner
      profile: typeof profile
      sharing: typeof sharing
    }
  }
}
