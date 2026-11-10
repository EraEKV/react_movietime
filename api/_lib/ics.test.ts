import { describe, expect, it } from 'vitest'
import { toIcs, unitsLabel, validTimeZone } from './ics.js'

const now = new Date(Date.UTC(2026, 10, 10, 12, 0))
const event = {
  uid: 's1@movietime',
  date: '2026-11-13',
  time: '22:30',
  minutes: 152,
  summary: 'The Dark Knight, part; one',
  description: 'The Dark Knight',
  url: 'https://example.com/planner/p1',
}

describe('toIcs with a time zone', () => {
  const ics = toIcs('Avleron', [event], now, 'Asia/Almaty')

  it('writes wall-clock times in that zone', () => {
    expect(ics).toContain('DTSTART;TZID=Asia/Almaty:20261113T223000')
    expect(ics).toContain('DTEND;TZID=Asia/Almaty:20261114T010200')
    expect(ics).toContain('X-WR-TIMEZONE:Asia/Almaty')
  })
  it('escapes the text and ends every line with CRLF', () => {
    expect(ics).toContain('SUMMARY:The Dark Knight\\, part\\; one')
    expect(ics.split('\r\n').at(-1)).toBe('')
    expect(ics.replace(/\r\n/g, '')).not.toContain('\n')
  })
  it('does not depend on the zone the code runs in', () => {
    const other = toIcs('Avleron', [event], now, 'America/New_York')
    expect(other).toContain('DTSTART;TZID=America/New_York:20261113T223000')
  })
  it('ignores a zone that is not one, and keeps the line out of the file', () => {
    const bad = toIcs('Avleron', [event], now, 'Mars/Base\r\nX-EVIL:1')
    expect(bad).not.toContain('X-EVIL')
    expect(bad).not.toContain('TZID')
    expect(bad).toContain('DTSTART:')
  })
})

describe('toIcs without a time zone', () => {
  it('writes UTC moments', () => {
    const ics = toIcs('Avleron', [event], now)
    expect(ics).toMatch(/DTSTART:\d{8}T\d{6}Z/)
    expect(ics).toMatch(/DTEND:\d{8}T\d{6}Z/)
    expect(ics).not.toContain('TZID')
  })
  it('folds long lines at 75 octets', () => {
    const ics = toIcs('Avleron', [{ ...event, summary: 'Ж'.repeat(80) }], now)
    expect(ics.split('\r\n').every((line) => new TextEncoder().encode(line).length <= 75)).toBe(
      true,
    )
  })
})

describe('validTimeZone', () => {
  it('accepts IANA names only', () => {
    expect(validTimeZone('Asia/Almaty')).toBe(true)
    expect(validTimeZone('UTC')).toBe(true)
    expect(validTimeZone('Not/AZone')).toBe(false)
    expect(validTimeZone('')).toBe(false)
    expect(validTimeZone(5)).toBe(false)
  })
})

describe('unitsLabel', () => {
  const ep = (season: number, episode: number) => ({ season, episode, title: `E${episode}` })
  it('collapses ranges and names a movie by its title', () => {
    expect(unitsLabel([ep(1, 1), ep(1, 2)])).toBe('S1E1–E2')
    expect(unitsLabel([ep(1, 3), ep(2, 1)])).toBe('S1E3–S2E1')
    expect(unitsLabel([{ season: null, episode: null, title: 'The Matrix' }])).toBe('The Matrix')
  })
})
