import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./firebase', () => ({
  auth: { currentUser: { getIdToken: () => Promise.resolve('id-token') } },
}))

const reply = (status: number, body: object = {}) => Response.json(body, { status })

describe('calendarService', () => {
  beforeEach(() => vi.resetModules())
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('reads the connection state and sends the Firebase token', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(reply(200, { configured: true, connected: true, lastSyncAt: 5 }))
    vi.stubGlobal('fetch', fetchMock)
    const { loadStatus } = await import('./calendarService')
    expect(await loadStatus()).toEqual({ state: 'connected', revoked: false, lastSyncAt: 5 })
    expect((fetchMock.mock.calls[0]?.[1] as RequestInit).headers).toMatchObject({
      authorization: 'Bearer id-token',
    })
  })

  it('is unavailable when the server isn’t configured or isn’t there (vite dev)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply(200, { configured: false })))
    const first = await import('./calendarService')
    expect(await first.loadStatus()).toEqual({ state: 'unavailable' })

    vi.resetModules()
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    const second = await import('./calendarService')
    expect(await second.loadStatus()).toEqual({ state: 'unavailable' })
  })

  it('does not call sync when nothing is connected', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(200, { configured: true, connected: false }))
    vi.stubGlobal('fetch', fetchMock)
    const { syncNow } = await import('./calendarService')
    expect(await syncNow('all')).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('sends the plan and the time zone when connected', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(reply(200, { configured: true, connected: true }))
      .mockResolvedValueOnce(reply(200, { ok: true }))
    vi.stubGlobal('fetch', fetchMock)
    const { syncNow } = await import('./calendarService')
    expect(await syncNow('p1')).toBe(true)
    const [url, init] = fetchMock.mock.calls[1] ?? []
    expect(url).toBe('/api/google-calendar/sync')
    expect(JSON.parse(init.body as string)).toMatchObject({
      planId: 'p1',
      timeZone: expect.any(String),
    })
  })

  it('syncs a plan once after a burst of changes', async () => {
    vi.useFakeTimers()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(reply(200, { configured: true, connected: true }))
      .mockResolvedValue(reply(200, { ok: true }))
    vi.stubGlobal('fetch', fetchMock)
    const { requestSync } = await import('./calendarService')
    requestSync('p1')
    requestSync('p1')
    requestSync('p1')
    await vi.advanceTimersByTimeAsync(2000)
    const syncs = fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/sync'))
    expect(syncs).toHaveLength(1)
  })
})
