import { currentLocale } from '../i18n'

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['minute', 60],
  ['hour', 60 * 60],
  ['day', 24 * 60 * 60],
]

const WEEK = 7 * 24 * 60 * 60

/**
 * "just now", "5 minutes ago", "3 hours ago", "yesterday", "4 days ago"; a week and older
 * becomes a date ("Oct 30", or "Oct 30, 2025" for another year). Pure: `now` is a parameter,
 * so tests can pin it; `locale` defaults to the interface language.
 */
export function relativeTime(
  iso: string,
  now: Date = new Date(),
  locale = currentLocale(),
): string {
  const date = new Date(iso)
  // A server timestamp can be a moment ahead of this device's clock: treat it as "now".
  const seconds = Math.max(0, Math.round((now.getTime() - date.getTime()) / 1000))
  if (seconds < 60) {
    return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(0, 'second')
  }

  if (seconds < WEEK) {
    // The biggest unit that fits: 90 minutes → "1 hour ago", 26 hours → "yesterday".
    const [unit, size] = UNITS.findLast(([, s]) => seconds >= s) ?? ['minute', 60]
    return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(
      -Math.floor(seconds / size),
      unit,
    )
  }

  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() !== now.getFullYear() && { year: 'numeric' }),
  }).format(date)
}
