import { randomBytes } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  authUrl,
  deleteEvent,
  GrantRevokedError,
  insertEvent,
  listAppEvents,
  accessTokenFor,
  type GoogleConfig,
} from './gcalGoogle'

const config: GoogleConfig = {
  clientId: 'client',
  clientSecret: 'secret',
  key: randomBytes(32),
  redirectUri: null,
}
const event = { id: 'mt1', planId: 'p', sessionId: 's', hash: 'h', body: { id: 'mt1' } }

afterEach(() => vi.unstubAllGlobals())

const stub = (...responses: Response[]) => {
  const fetchMock = vi.fn()
  for (const r of responses) fetchMock.mockResolvedValueOnce(r)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}
const reply = (status: number, body: object = {}) => Response.json(body, { status })

describe('authUrl', () => {
  it('asks for offline access with consent, only the events scope, and our callback', () => {
    const url = new URL(authUrl(config, 'https://avleron.com/api/google-calendar', 'st'))
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth')
    expect(url.searchParams.get('access_type')).toBe('offline')
    expect(url.searchParams.get('prompt')).toBe('consent')
    expect(url.searchParams.get('scope')).toBe('https://www.googleapis.com/auth/calendar.events')
    expect(url.searchParams.get('redirect_uri')).toBe(
      'https://avleron.com/api/google-calendar/callback',
    )
    expect(url.searchParams.get('state')).toBe('st')
  })

  it('prefers GOOGLE_REDIRECT_URI when set', () => {
    const url = new URL(
      authUrl({ ...config, redirectUri: 'https://x.test/cb' }, 'https://a.test/', 's'),
    )
    expect(url.searchParams.get('redirect_uri')).toBe('https://x.test/cb')
  })
})

describe('accessTokenFor', () => {
  it('returns the access token', async () => {
    stub(reply(200, { access_token: 'at' }))
    expect(await accessTokenFor(config, 'rt')).toBe('at')
  })

  it('reports a revoked grant', async () => {
    stub(reply(400, { error: 'invalid_grant' }))
    await expect(accessTokenFor(config, 'rt')).rejects.toBeInstanceOf(GrantRevokedError)
  })
})

describe('listAppEvents', () => {
  it('follows pages and reads the markers back', async () => {
    const item = (n: string) => ({
      id: `e${n}`,
      extendedProperties: {
        private: { movietimeSessionId: `s${n}`, movietimePlanId: 'p', movietimeHash: 'h' },
      },
    })
    const fetchMock = stub(
      reply(200, { items: [item('1')], nextPageToken: 'next' }),
      reply(200, { items: [item('2'), { id: 'foreign' }] }),
    )
    const events = await listAppEvents('at', 'p')
    expect(events.map((e) => e.sessionId)).toEqual(['s1', 's2'])
    const first = String(fetchMock.mock.calls[0][0])
    expect(first).toContain('privateExtendedProperty=movietimeApp%3D1')
    expect(first).toContain('privateExtendedProperty=movietimePlanId%3Dp')
    expect(String(fetchMock.mock.calls[1][0])).toContain('pageToken=next')
  })
})

describe('insertEvent / deleteEvent', () => {
  it('brings back an event that exists already (409) with a patch', async () => {
    const fetchMock = stub(reply(409), reply(200))
    await insertEvent('at', event)
    expect(fetchMock.mock.calls[1][1].method).toBe('PATCH')
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({ status: 'confirmed' })
  })

  it('treats an event that is already gone as deleted', async () => {
    stub(reply(410))
    await expect(deleteEvent('at', 'mt1')).resolves.toBeUndefined()
  })

  it('maps 401 to a revoked grant', async () => {
    stub(reply(401))
    await expect(deleteEvent('at', 'mt1')).rejects.toBeInstanceOf(GrantRevokedError)
  })
})
