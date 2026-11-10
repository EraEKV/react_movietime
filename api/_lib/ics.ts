// Calendar files (RFC 5545) for the planner. No imports on purpose: the browser's
// "Export .ics" and the server's calendar feed (api/ics.ts) share this one generator.

/** One event per watching session. `date` is "YYYY-MM-DD" and `time` "HH:mm", wall-clock. */
export interface IcsEvent {
  uid: string
  date: string
  time: string
  minutes: number
  summary: string
  description?: string
  url?: string
}

/** A unit as far as its label goes: an episode (season + episode) or a movie (title). */
interface LabelUnit {
  season: number | null
  episode: number | null
  title: string
}

const episodeCode = (season: number, episode: number) => `S${season}E${episode}`

/**
 * Short label of what a session covers: "S2E5", "S2E5–E6", "S2E9–S3E1", or the movie title.
 */
export function unitsLabel(units: LabelUnit[]): string {
  const first = units[0]
  const last = units[units.length - 1]
  if (!first || !last) return ''
  if (first.season === null || first.episode === null) {
    return units.map((u) => u.title).join(', ')
  }
  const start = episodeCode(first.season, first.episode)
  if (units.length === 1 || last.season === null || last.episode === null) return start
  return last.season === first.season
    ? `${start}–E${last.episode}`
    : `${start}–${episodeCode(last.season, last.episode)}`
}

/** The brand colour (`--brand-teal` in the design tokens). */
const BRAND_COLOR = '#01B4E4'

/** Text values escape backslash, semicolon, comma and newlines. */
const escapeText = (value: string) =>
  value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

/** Lines longer than 75 octets are folded: CRLF + one space, never inside a character. */
function fold(line: string): string {
  const encoder = new TextEncoder()
  if (encoder.encode(line).length <= 75) return line
  const parts: string[] = []
  let current = ''
  let size = 0
  for (const char of line) {
    const bytes = encoder.encode(char).length
    // Continuation lines start with a space, which counts towards their 75.
    if (size + bytes > (parts.length === 0 ? 75 : 74)) {
      parts.push(current)
      current = ''
      size = 0
    }
    current += char
    size += bytes
  }
  parts.push(current)
  return parts.join('\r\n ')
}

/** 20261106T180000Z. */
const icsUtc = (date: Date) =>
  date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')

/**
 * Local day + time → the exact moment, in the zone this code runs in. The local Date
 * constructor applies that day's UTC offset, so a session at 21:00 stays at 21:00 on both
 * sides of a DST change. Only the browser knows the user's zone: a server passes `timeZone`.
 */
export function localMoment(day: string, time: string): Date {
  const [y, m, d] = day.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  return new Date(y ?? 0, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0)
}

/** A zone name as the calendar apps know it ("Asia/Almaty"), or null when it isn't one. */
export function validTimeZone(value: unknown): value is string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_+\-/]{1,64}$/.test(value)) return false
  try {
    new Intl.DateTimeFormat('en', { timeZone: value })
    return true
  } catch {
    return false
  }
}

/** 20261106T210000: a wall-clock moment without any zone, `plus` minutes after day + time. */
function wallClock(day: string, time: string, plus = 0): string {
  const [y, m, d] = day.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  // Plain arithmetic on a UTC date: the numbers are the wall clock, no offset is applied.
  return new Date(Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1, hh ?? 0, (mm ?? 0) + plus))
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, '')
}

/**
 * A calendar file with one event per session. `now` is passed in to keep this pure.
 *
 * Without `timeZone` the times are the running machine's local ones, written in UTC (the
 * browser's file download). With it they are written as that zone's wall-clock times
 * (`DTSTART;TZID=…`), so a server in another zone still puts 21:00 at 21:00, and a daylight
 * saving change moves nothing. A zone that isn't valid counts as no zone.
 */
export function toIcs(
  calendarName: string,
  events: IcsEvent[],
  now: Date,
  timeZone?: string,
): string {
  const zone = validTimeZone(timeZone) ? timeZone : null
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Avleron//Planner//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(calendarName)}`,
    // The brand colour for the apps that read it (Apple Calendar and others). Google
    // Calendar ignores a feed's colour and keeps the one the user picks.
    `X-APPLE-CALENDAR-COLOR:${BRAND_COLOR}`,
    'COLOR:deepskyblue',
    ...(zone ? [`X-WR-TIMEZONE:${zone}`] : []),
  ]
  for (const event of events) {
    const minutes = Math.max(event.minutes, 1)
    let start: string
    let end: string
    if (zone) {
      start = `DTSTART;TZID=${zone}:${wallClock(event.date, event.time)}`
      end = `DTEND;TZID=${zone}:${wallClock(event.date, event.time, minutes)}`
    } else {
      const from = localMoment(event.date, event.time)
      start = `DTSTART:${icsUtc(from)}`
      end = `DTEND:${icsUtc(new Date(from.getTime() + minutes * 60_000))}`
    }
    lines.push(
      'BEGIN:VEVENT',
      `UID:${event.uid}`,
      `DTSTAMP:${icsUtc(now)}`,
      start,
      end,
      `SUMMARY:${escapeText(event.summary)}`,
      ...(event.description ? [`DESCRIPTION:${escapeText(event.description)}`] : []),
      ...(event.url ? [`URL:${event.url}`] : []),
      'END:VEVENT',
    )
  }
  lines.push('END:VCALENDAR')
  return lines.map(fold).join('\r\n') + '\r\n'
}
