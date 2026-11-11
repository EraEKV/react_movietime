import { afterEach, describe, expect, it, vi } from 'vitest'
import { readJson, verifyToken, type MailEnv } from './firebase'

const env: MailEnv = { apiKey: 'k', projectId: 'p', resendKey: 'r', from: 'f' } as MailEnv

afterEach(() => vi.unstubAllGlobals())

describe('readJson', () => {
  const post = (body: string, headers: Record<string, string> = {}) =>
    new Request('https://avleron.com/api/x', { method: 'POST', body, headers })

  it('parses a small JSON body', async () => {
    expect(await readJson(post('{"a":1}'))).toEqual({ a: 1 })
  })

  it('returns null for malformed, empty or oversized bodies', async () => {
    expect(await readJson(post('{oops'))).toBeNull()
    expect(await readJson(post(''))).toBeNull()
    expect(await readJson(post(JSON.stringify({ a: 'x'.repeat(9000) })))).toBeNull()
    expect(await readJson(post('{}', { 'content-length': '999999' }))).toBeNull()
    expect(await readJson(post(JSON.stringify({ a: 'x'.repeat(100) })), 50)).toBeNull()
  })
})

describe('verifyToken', () => {
  it('refuses what is not shaped like an ID token without asking Google', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    for (const junk of [
      '',
      'tok',
      'a.b.c',
      'x'.repeat(5000),
      'aaaa aaaaaa.bbbbbbbbbb.cccccccccc',
    ]) {
      expect(await verifyToken(env, junk)).toBeNull()
    }
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('asks Google about a well-formed token', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({ users: [{ localId: 'u1', email: 'A@x.io', emailVerified: true }] }),
      ),
    )
    expect(await verifyToken(env, 'header0000.payload0000.signature00')).toMatchObject({
      uid: 'u1',
      email: 'a@x.io',
    })
  })
})
