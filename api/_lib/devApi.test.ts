import { describe, expect, it } from 'vitest'
import { route } from '../../vite.dev-api'

const at = (path: string) => route(new URL(path, 'http://localhost:5173'))

describe('dev api routes', () => {
  it('maps /api/<name> to api/<name>.ts', () => {
    expect(at('/api/send-welcome')?.name).toBe('send-welcome')
    expect(at('/api/google-calendar/sync')?.name).toBe('google-calendar/sync')
  })

  it('maps the calendar link like vercel.json does', () => {
    const found = at('/api/calendar/abc_DEF-123.ics')
    expect(found?.name).toBe('ics')
    expect(found?.url.searchParams.get('file')).toBe('abc_DEF-123.ics')
  })

  it('leaves TMDB to the dev proxy and never serves helpers', () => {
    expect(at('/api/tmdb')).toBeNull()
    expect(at('/api/_lib/admin')).toBeNull()
    expect(at('/api/../package')).toBeNull()
    expect(at('/other')).toBeNull()
  })
})
