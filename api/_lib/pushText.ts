import type { Locale } from './layout.js'
import type { Role } from './templates.js'

// Text of the push notifications, in the language the subscriber had in the app. Short:
// a notification is read at a glance. Sentence case, no emoji.

export type PushKind = 'shared' | 'role'

const ROLE = {
  en: { editor: 'You can add and change titles.', viewer: 'You can view it.' },
  ru: { editor: 'Вы можете добавлять и менять фильмы.', viewer: 'Вы можете смотреть.' },
  kk: { editor: 'Сіз фильмдерді қосып, өзгерте аласыз.', viewer: 'Сіз қарай аласыз.' },
} satisfies Record<Locale, Record<Role, string>>

const TITLE = {
  en: {
    shared: (o: string, n: string) => `${o} shared “${n}” with you`,
    role: (o: string, n: string) => `${o} changed your access to “${n}”`,
  },
  ru: {
    shared: (o: string, n: string) => `${o} поделился(-ась) с вами «${n}»`,
    role: (o: string, n: string) => `${o} изменил(а) ваш доступ к «${n}»`,
  },
  kk: {
    shared: (o: string, n: string) => `${o} сізбен «${n}» тізімін бөлісті`,
    role: (o: string, n: string) => `${o} «${n}» тізіміне қолжетімділігіңізді өзгертті`,
  },
} satisfies Record<Locale, Record<PushKind, (owner: string, name: string) => string>>

export function pushMessage(
  locale: Locale,
  kind: PushKind,
  p: { owner: string; name: string; role: Role; path: string; tag: string },
) {
  return {
    title: TITLE[locale][kind](
      p.owner.slice(0, 80) || 'Movietime',
      p.name.slice(0, 120) || 'Movietime',
    ),
    body: ROLE[locale][p.role],
    url: p.path,
    tag: p.tag,
  }
}
