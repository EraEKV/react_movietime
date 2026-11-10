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
      p.owner.slice(0, 80) || 'Avleron',
      p.name.slice(0, 120) || 'Avleron',
    ),
    body: ROLE[locale][p.role],
    url: p.path,
    tag: p.tag,
  }
}

// A film suggestion in a movie marathon: to the owner when a member suggests, to the author
// when the owner answers.
export type SuggestionPushKind = 'proposal' | 'accepted' | 'rejected'

const SUGGESTION_TITLE = {
  en: {
    proposal: (n: string, f: string) => `${n} suggests “${f}”`,
    accepted: (n: string, f: string) => `${n} accepted “${f}”`,
    rejected: (n: string, f: string) => `${n} declined “${f}”`,
  },
  ru: {
    proposal: (n: string, f: string) => `${n} предлагает «${f}»`,
    accepted: (n: string, f: string) => `${n} принял(а) «${f}»`,
    rejected: (n: string, f: string) => `${n} отклонил(а) «${f}»`,
  },
  kk: {
    proposal: (n: string, f: string) => `${n} «${f}» фильмін ұсынады`,
    accepted: (n: string, f: string) => `${n} «${f}» ұсынысын қабылдады`,
    rejected: (n: string, f: string) => `${n} «${f}» ұсынысынан бас тартты`,
  },
} satisfies Record<Locale, Record<SuggestionPushKind, (from: string, film: string) => string>>

const SUGGESTION_BODY = {
  en: (plan: string, kind: SuggestionPushKind) =>
    kind === 'proposal' ? `For “${plan}”. Open it to decide.` : `In “${plan}”.`,
  ru: (plan: string, kind: SuggestionPushKind) =>
    kind === 'proposal' ? `Для «${plan}». Откройте, чтобы решить.` : `В «${plan}».`,
  kk: (plan: string, kind: SuggestionPushKind) =>
    kind === 'proposal' ? `«${plan}» үшін. Шешу үшін ашыңыз.` : `«${plan}» ішінде.`,
} satisfies Record<Locale, (plan: string, kind: SuggestionPushKind) => string>

export function suggestionMessage(
  locale: Locale,
  kind: SuggestionPushKind,
  p: { from: string; film: string; plan: string; path: string; tag: string },
) {
  return {
    title: SUGGESTION_TITLE[locale][kind](
      p.from.slice(0, 80) || 'Avleron',
      p.film.slice(0, 120) || 'Avleron',
    ),
    body: SUGGESTION_BODY[locale](p.plan.slice(0, 120) || 'Avleron', kind),
    url: p.path,
    tag: p.tag,
  }
}
