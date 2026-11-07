// The invite email, in the app's three languages. `_lib` is not a route on Vercel.
//
// Styled with the design-system tokens (dark theme): email clients can't read CSS
// variables or load our fonts reliably, so the hex values are inlined and the font stacks
// fall back to system-ui. Table layout and inline styles are what mail clients support.

const LOCALES = ['en', 'ru', 'kk'] as const
export type Locale = (typeof LOCALES)[number]
export type Role = 'editor' | 'viewer'

export const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && (LOCALES as readonly string[]).includes(value)

interface Copy {
  kicker: string
  subject: (owner: string, name: string) => string
  title: (owner: string, name: string) => string
  role: Record<Role, string>
  hint: string
  button: string
  fallback: string
  footer: string
}

const COPY: Record<Locale, Copy> = {
  en: {
    kicker: 'Invitation',
    subject: (owner, name) => `${owner} invited you to “${name}” on Movietime`,
    title: (owner, name) => `${owner} invited you to “${name}”`,
    role: { editor: 'You can add and change titles.', viewer: 'You can view it.' },
    hint: 'Sign up or sign in with this address and verify it. The invitation opens right away.',
    button: 'Open invitation',
    fallback: 'Button not working? Open this link:',
    footer: 'You got this email because someone invited you on Movietime.',
  },
  ru: {
    kicker: 'Приглашение',
    subject: (owner, name) => `${owner} приглашает вас в «${name}» на Movietime`,
    title: (owner, name) => `${owner} приглашает вас в «${name}»`,
    role: { editor: 'Вы сможете добавлять и менять фильмы.', viewer: 'Вы сможете смотреть.' },
    hint: 'Зарегистрируйтесь или войдите с этой почтой и подтвердите адрес — приглашение откроется сразу.',
    button: 'Открыть приглашение',
    fallback: 'Кнопка не работает? Откройте ссылку:',
    footer: 'Вы получили это письмо, потому что вас пригласили в Movietime.',
  },
  kk: {
    kicker: 'Шақыру',
    subject: (owner, name) => `${owner} сізді Movietime-дағы «${name}» тізіміне шақырды`,
    title: (owner, name) => `${owner} сізді «${name}» тізіміне шақырды`,
    role: { editor: 'Сіз фильмдерді қосып, өзгерте аласыз.', viewer: 'Сіз қарай аласыз.' },
    hint: 'Осы поштамен тіркеліңіз немесе кіріңіз де, мекенжайды растаңыз — шақыру бірден ашылады.',
    button: 'Шақыруды ашу',
    fallback: 'Түйме жұмыс істемей ме? Сілтемені ашыңыз:',
    footer: 'Бұл хатты сізді Movietime-ға шақырғандықтан алдыңыз.',
  },
}

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

// Design-system tokens, dark theme.
const C = {
  bg: '#0b0c0f',
  surface: '#16191f',
  border: '#2a2f37',
  text: '#e8eaed',
  muted: '#a6adb8',
  subtle: '#98a0ab',
  accent: '#3cc6ea',
  teal: '#01b4e4',
  onAccent: '#04212a',
}
const DISPLAY = `Unbounded,Onest,system-ui,-apple-system,'Segoe UI',sans-serif`
const SANS = `Onest,system-ui,-apple-system,'Segoe UI',sans-serif`

export function inviteEmail(
  locale: Locale,
  { owner, name, role, url }: { owner: string; name: string; role: Role; url: string },
) {
  const copy = COPY[locale]
  const who = owner.slice(0, 80) || 'Movietime'
  const title = name.slice(0, 120) || 'Movietime'
  const safeUrl = escapeHtml(url)

  const html = `<!doctype html>
<html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Onest:wght@400;600&family=Unbounded:wght@600&display=swap">
</head>
<body style="margin:0;padding:0;background:${C.bg};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};">
<tr><td align="center" style="padding:32px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
    <tr><td style="padding:0 0 24px 4px;font-family:${DISPLAY};font-size:18px;font-weight:600;color:${C.text};">
      <span style="display:inline-block;width:12px;height:12px;border-radius:4px;background:${C.teal};background-image:linear-gradient(100deg,#01b4e4,#90cea1);margin-right:8px;"></span>Movietime
    </td></tr>
    <tr><td style="background:${C.surface};border:1px solid ${C.border};border-radius:12px;padding:32px 24px;">
      <div style="font-family:${SANS};font-size:11px;line-height:16px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${C.accent};">${escapeHtml(copy.kicker)}</div>
      <h1 style="margin:8px 0 12px;font-family:${DISPLAY};font-size:24px;line-height:30px;font-weight:600;letter-spacing:-0.01em;color:${C.text};">${escapeHtml(copy.title(who, title))}</h1>
      <p style="margin:0 0 8px;font-family:${SANS};font-size:16px;line-height:24px;color:${C.text};">${escapeHtml(copy.role[role])}</p>
      <p style="margin:0 0 24px;font-family:${SANS};font-size:14px;line-height:20px;color:${C.muted};">${escapeHtml(copy.hint)}</p>
      <a href="${safeUrl}" style="display:inline-block;padding:12px 24px;border-radius:8px;background:${C.teal};background-image:linear-gradient(100deg,#01b4e4,#90cea1);font-family:${SANS};font-size:14px;line-height:20px;font-weight:600;color:${C.onAccent};text-decoration:none;">${escapeHtml(copy.button)}</a>
      <p style="margin:24px 0 0;font-family:${SANS};font-size:12px;line-height:16px;color:${C.subtle};">${escapeHtml(copy.fallback)}<br><a href="${safeUrl}" style="color:${C.accent};word-break:break-all;">${safeUrl}</a></p>
    </td></tr>
    <tr><td style="padding:16px 4px 0;font-family:${SANS};font-size:12px;line-height:16px;color:${C.subtle};">${escapeHtml(copy.footer)}</td></tr>
  </table>
</td></tr>
</table>
</body></html>`

  return {
    subject: copy.subject(who, title),
    text: `${copy.title(who, title)}\n\n${copy.role[role]}\n${copy.hint}\n\n${url}\n`,
    html,
  }
}
