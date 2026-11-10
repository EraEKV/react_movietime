import { describe, expect, it } from 'vitest'
import { buildFeed, tokenFrom, TOKEN } from './feed.js'

const token = 'abcDEF0123456789abcdef0123456789'.slice(0, 32)

describe('tokenFrom', () => {
  it('reads the token from ?token= and from the pretty URL', () => {
    expect(tokenFrom(new URL(`https://x.app/api/ics?token=${token}`))).toBe(token)
    expect(tokenFrom(new URL(`https://x.app/api/ics?file=${token}.ics`))).toBe(token)
  })
  it('rejects anything that is not a token, so nothing reaches Firestore', () => {
    for (const bad of ['', 'short', `${token}x`, `${token.slice(0, 31)}!`, `../${token}`]) {
      expect(
        tokenFrom(new URL(`https://x.app/api/ics?token=${encodeURIComponent(bad)}`)),
      ).toBeNull()
    }
    expect(tokenFrom(new URL('https://x.app/api/ics'))).toBeNull()
    expect(TOKEN.test(token)).toBe(true)
  })
})

describe('buildFeed', () => {
  const plans = [
    { id: 'p1', title: 'Dark', mediaTitle: 'Dark' },
    { id: 'p2', title: 'Nolan marathon', mediaTitle: null },
  ]
  const ep = (episode: number) => ({ season: 1, episode, title: `Ep ${episode}` })
  const sessions = [
    {
      id: 's2',
      planId: 'p2',
      date: '2026-11-13',
      time: '22:30',
      minutes: 152,
      units: [{ season: null, episode: null, title: 'The Dark Knight' }],
    },
    {
      id: 's1',
      planId: 'p1',
      date: '2026-11-12',
      time: '21:00',
      minutes: 90,
      units: [ep(1), ep(2)],
    },
    {
      id: 'orphan',
      planId: 'gone',
      date: '2026-11-14',
      time: '21:00',
      minutes: 90,
      units: [ep(3)],
    },
  ]
  const ics = buildFeed(
    plans,
    sessions,
    'https://app.example',
    'Asia/Almaty',
    new Date(Date.UTC(2026, 10, 10)),
  )

  it('lists the sessions of all plans by date, in the user zone', () => {
    expect(ics.indexOf('UID:s1@movietime')).toBeLessThan(ics.indexOf('UID:s2@movietime'))
    expect(ics).toContain('DTSTART;TZID=Asia/Almaty:20261112T210000')
    expect(ics).toContain('DTSTART;TZID=Asia/Almaty:20261113T223000')
  })
  it('names events like the plan page export does', () => {
    expect(ics).toContain('SUMMARY:Dark · S1E1–E2')
    expect(ics).toContain('SUMMARY:Nolan marathon · The Dark Knight')
    expect(ics).toContain('URL:https://app.example/planner/p1')
  })
  it('skips sessions whose plan is not in the feed', () => {
    expect(ics).not.toContain('orphan')
  })
  it('is a valid empty calendar with no sessions', () => {
    const empty = buildFeed([], [], 'https://app.example', 'UTC', new Date())
    expect(empty).toContain('BEGIN:VCALENDAR')
    expect(empty).not.toContain('BEGIN:VEVENT')
  })
})
