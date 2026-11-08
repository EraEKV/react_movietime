// One layout for every email, built from the design-system tokens (dark theme). Email
// clients can't read CSS variables or load our fonts reliably, so the hex values are
// inlined and the font stacks fall back to system-ui. Tables and inline styles are what
// mail clients support.

export type Locale = 'en' | 'ru' | 'kk'
const LOCALES: readonly string[] = ['en', 'ru', 'kk']

export const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && LOCALES.includes(value)

export const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

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

export interface Block {
  /** `lead` is body text, `note` is the quieter helper text under it. */
  tone: 'lead' | 'note'
  text: string
}

export interface LayoutInput {
  locale: Locale
  kicker: string
  title: string
  blocks: Block[]
  button?: { label: string; url: string }
  /** Shown under the button for clients that don't render it. */
  fallback?: string
  footer: string
}

export function renderEmail(input: LayoutInput): string {
  const { locale, kicker, title, blocks, button, fallback, footer } = input
  const paragraphs = blocks
    .map((block, index) => {
      const last = index === blocks.length - 1
      const style =
        block.tone === 'lead'
          ? `font-size:16px;line-height:24px;color:${C.text};`
          : `font-size:14px;line-height:20px;color:${C.muted};`
      return `<p style="margin:0 0 ${last ? (button ? 24 : 0) : 8}px;font-family:${SANS};${style}">${escapeHtml(block.text)}</p>`
    })
    .join('\n      ')
  const url = button ? escapeHtml(button.url) : ''
  const buttonHtml = button
    ? `<a href="${url}" style="display:inline-block;padding:12px 24px;border-radius:8px;background:${C.teal};background-image:linear-gradient(100deg,#01b4e4,#90cea1);font-family:${SANS};font-size:14px;line-height:20px;font-weight:600;color:${C.onAccent};text-decoration:none;">${escapeHtml(button.label)}</a>
      ${
        fallback
          ? `<p style="margin:24px 0 0;font-family:${SANS};font-size:12px;line-height:16px;color:${C.subtle};">${escapeHtml(fallback)}<br><a href="${url}" style="color:${C.accent};word-break:break-all;">${url}</a></p>`
          : ''
      }`
    : ''

  return `<!doctype html>
<html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Onest:wght@400;600&family=Unbounded:wght@600&display=swap">
</head>
<body style="margin:0;padding:0;background:${C.bg};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};">
<tr><td align="center" style="padding:32px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
    <tr><td style="padding:0 0 24px 4px;font-family:${DISPLAY};font-size:18px;font-weight:600;color:${C.text};">
      <span style="display:inline-block;width:12px;height:12px;border-radius:4px;background:${C.teal};background-image:linear-gradient(100deg,#01b4e4,#90cea1);margin-right:8px;"></span>Avleron
    </td></tr>
    <tr><td style="background:${C.surface};border:1px solid ${C.border};border-radius:12px;padding:32px 24px;">
      <div style="font-family:${SANS};font-size:11px;line-height:16px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${C.accent};">${escapeHtml(kicker)}</div>
      <h1 style="margin:8px 0 12px;font-family:${DISPLAY};font-size:24px;line-height:30px;font-weight:600;letter-spacing:-0.01em;color:${C.text};">${escapeHtml(title)}</h1>
      ${paragraphs}
      ${buttonHtml}
    </td></tr>
    <tr><td style="padding:16px 4px 0;font-family:${SANS};font-size:12px;line-height:16px;color:${C.subtle};">${escapeHtml(footer)}</td></tr>
  </table>
</td></tr>
</table>
</body></html>`
}
