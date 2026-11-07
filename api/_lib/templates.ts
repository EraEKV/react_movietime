// Text of every email, in the app's three languages. Voice follows the design system:
// calm, short sentences, sentence case, no emoji.
import { renderEmail, type Locale } from './layout.js'

export type Role = 'editor' | 'viewer'

const who = (owner: string) => owner.slice(0, 80) || 'Movietime'
const what = (name: string) => name.slice(0, 120) || 'Movietime'

interface Mail {
  subject: string
  text: string
  html: string
}

// ---------- invitation ----------

const INVITE = {
  en: {
    kicker: 'Invitation',
    subject: (o: string, n: string) => `${o} invited you to “${n}” on Movietime`,
    title: (o: string, n: string) => `${o} invited you to “${n}”`,
    role: { editor: 'You can add and change titles.', viewer: 'You can view it.' },
    hint: 'Sign up or sign in with this address and verify it. The invitation opens right away.',
    button: 'Open invitation',
    fallback: 'Button not working? Open this link:',
    footer: 'You got this email because someone invited you on Movietime.',
  },
  ru: {
    kicker: 'Приглашение',
    subject: (o: string, n: string) => `${o} приглашает вас в «${n}» на Movietime`,
    title: (o: string, n: string) => `${o} приглашает вас в «${n}»`,
    role: { editor: 'Вы сможете добавлять и менять фильмы.', viewer: 'Вы сможете смотреть.' },
    hint: 'Зарегистрируйтесь или войдите с этой почтой и подтвердите адрес — приглашение откроется сразу.',
    button: 'Открыть приглашение',
    fallback: 'Кнопка не работает? Откройте ссылку:',
    footer: 'Вы получили это письмо, потому что вас пригласили в Movietime.',
  },
  kk: {
    kicker: 'Шақыру',
    subject: (o: string, n: string) => `${o} сізді Movietime-дағы «${n}» тізіміне шақырды`,
    title: (o: string, n: string) => `${o} сізді «${n}» тізіміне шақырды`,
    role: { editor: 'Сіз фильмдерді қосып, өзгерте аласыз.', viewer: 'Сіз қарай аласыз.' },
    hint: 'Осы поштамен тіркеліңіз немесе кіріңіз де, мекенжайды растаңыз — шақыру бірден ашылады.',
    button: 'Шақыруды ашу',
    fallback: 'Түйме жұмыс істемей ме? Сілтемені ашыңыз:',
    footer: 'Бұл хатты сізді Movietime-ға шақырғандықтан алдыңыз.',
  },
} satisfies Record<Locale, unknown>

export function inviteEmail(
  locale: Locale,
  p: { owner: string; name: string; role: Role; url: string },
): Mail {
  const c = INVITE[locale]
  const title = c.title(who(p.owner), what(p.name))
  return {
    subject: c.subject(who(p.owner), what(p.name)),
    text: `${title}\n\n${c.role[p.role]}\n${c.hint}\n\n${p.url}\n`,
    html: renderEmail({
      locale,
      kicker: c.kicker,
      title,
      blocks: [
        { tone: 'lead', text: c.role[p.role] },
        { tone: 'note', text: c.hint },
      ],
      button: { label: c.button, url: p.url },
      fallback: c.fallback,
      footer: c.footer,
    }),
  }
}

// ---------- role changed ----------

const ROLE_CHANGED = {
  en: {
    kicker: 'Access changed',
    subject: (o: string, n: string) => `${o} changed your access to “${n}”`,
    title: (o: string, n: string) => `${o} changed your access to “${n}”`,
    role: { editor: 'You can now add and change titles.', viewer: 'You can now view it.' },
    button: 'Open it',
    fallback: 'Button not working? Open this link:',
    footer: 'You got this email because you have access to a shared list on Movietime.',
  },
  ru: {
    kicker: 'Доступ изменён',
    subject: (o: string, n: string) => `${o} изменил(а) ваш доступ к «${n}»`,
    title: (o: string, n: string) => `${o} изменил(а) ваш доступ к «${n}»`,
    role: {
      editor: 'Теперь вы можете добавлять и менять фильмы.',
      viewer: 'Теперь вы можете смотреть.',
    },
    button: 'Открыть',
    fallback: 'Кнопка не работает? Откройте ссылку:',
    footer: 'Вы получили это письмо, потому что у вас есть доступ к общему списку в Movietime.',
  },
  kk: {
    kicker: 'Қолжетімділік өзгерді',
    subject: (o: string, n: string) => `${o} «${n}» тізіміне қолжетімділігіңізді өзгертті`,
    title: (o: string, n: string) => `${o} «${n}» тізіміне қолжетімділігіңізді өзгертті`,
    role: {
      editor: 'Енді сіз фильмдерді қосып, өзгерте аласыз.',
      viewer: 'Енді сіз қарай аласыз.',
    },
    button: 'Ашу',
    fallback: 'Түйме жұмыс істемей ме? Сілтемені ашыңыз:',
    footer: 'Бұл хатты Movietime-дағы ортақ тізімге қолжетімділігіңіз бар болғандықтан алдыңыз.',
  },
} satisfies Record<Locale, unknown>

export function roleChangedEmail(
  locale: Locale,
  p: { owner: string; name: string; role: Role; url: string },
): Mail {
  const c = ROLE_CHANGED[locale]
  const title = c.title(who(p.owner), what(p.name))
  return {
    subject: c.subject(who(p.owner), what(p.name)),
    text: `${title}\n\n${c.role[p.role]}\n\n${p.url}\n`,
    html: renderEmail({
      locale,
      kicker: c.kicker,
      title,
      blocks: [{ tone: 'lead', text: c.role[p.role] }],
      button: { label: c.button, url: p.url },
      fallback: c.fallback,
      footer: c.footer,
    }),
  }
}

// ---------- welcome ----------

const WELCOME = {
  en: {
    kicker: 'Welcome',
    subject: 'Welcome to Movietime',
    title: (n: string) => `Welcome, ${n}`,
    intro: 'Your email is verified. An evening here usually goes like this:',
    steps: [
      'Find a title in Discover and save it to your library.',
      'Turn saved titles into a schedule in Planner.',
      'Watch, rate episodes and track your progress.',
    ],
    button: 'Open Movietime',
    footer: 'You got this email because you signed up for Movietime.',
  },
  ru: {
    kicker: 'Добро пожаловать',
    subject: 'Добро пожаловать в Movietime',
    title: (n: string) => `Добро пожаловать, ${n}`,
    intro: 'Почта подтверждена. Обычный вечер здесь выглядит так:',
    steps: [
      'Найдите фильм в разделе «Каталог» и сохраните его в библиотеку.',
      'Составьте расписание просмотров в планировщике.',
      'Смотрите, оценивайте серии и следите за прогрессом.',
    ],
    button: 'Открыть Movietime',
    footer: 'Вы получили это письмо, потому что зарегистрировались в Movietime.',
  },
  kk: {
    kicker: 'Қош келдіңіз',
    subject: 'Movietime-ға қош келдіңіз',
    title: (n: string) => `Қош келдіңіз, ${n}`,
    intro: 'Пошта расталды. Мұндағы әдеттегі кеш былай өтеді:',
    steps: [
      'Каталогтан фильм тауып, кітапханаға сақтаңыз.',
      'Жоспарлаушыда көру кестесін құрыңыз.',
      'Қараңыз, серияларды бағалаңыз және барысын қадағалаңыз.',
    ],
    button: 'Movietime ашу',
    footer: 'Бұл хатты Movietime-ға тіркелгендіктен алдыңыз.',
  },
} satisfies Record<Locale, unknown>

export function welcomeEmail(locale: Locale, p: { name: string; url: string }): Mail {
  const c = WELCOME[locale]
  const title = c.title(p.name.slice(0, 40) || 'Movietime')
  return {
    subject: c.subject,
    text: `${title}\n\n${c.intro}\n${c.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n${p.url}\n`,
    html: renderEmail({
      locale,
      kicker: c.kicker,
      title,
      blocks: [
        { tone: 'note', text: c.intro },
        ...c.steps.map((s, i) => ({ tone: 'lead' as const, text: `${i + 1}. ${s}` })),
      ],
      button: { label: c.button, url: p.url },
      footer: c.footer,
    }),
  }
}
