import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Field } from './firebase.js'
import { FRESH_MS, resolveSuggestion, suggestionPush } from './suggestion.js'

const s = (stringValue: string): Field => ({ stringValue })
const t = (ms: number): Field => ({ timestampValue: new Date(ms).toISOString() })
const NOW = Date.parse('2027-01-05T20:00:00Z')

const plan = {
  kind: s('list'),
  ownerUid: s('owner'),
  ownerName: s('Olga'),
  title: s('Dark Knight marathon'),
}
const offer = (over: Record<string, Field> = {}) => ({
  by: { mapValue: { fields: { uid: s('vera'), name: s('Vera') } } },
  unit: { mapValue: { fields: { title: s('Inception') } } },
  status: s('pending'),
  createdAt: t(NOW - 5000),
  decidedAt: { nullValue: undefined } as Field,
  ...over,
})

describe('suggestionPush', () => {
  it('tells the owner about a fresh suggestion made by the caller', () => {
    expect(suggestionPush('proposal', 'vera', 'p1', 's1_vera', plan, offer(), NOW)).toEqual({
      uid: 'owner',
      kind: 'proposal',
      from: 'Vera',
      film: 'Inception',
      plan: 'Dark Knight marathon',
      path: '/planner/p1',
      tag: 'offer:s1_vera',
    })
  })

  it('refuses a proposal push from someone else, for a decided one, or a stale one', () => {
    const ask = (caller: string, o = offer()) =>
      suggestionPush('proposal', caller, 'p1', 's1_vera', plan, o, NOW)
    expect(ask('mallory')).toBeNull()
    expect(ask('vera', offer({ status: s('accepted') }))).toBeNull()
    expect(ask('vera', offer({ createdAt: t(NOW - FRESH_MS - 1000) }))).toBeNull()
    expect(ask('vera', offer({ createdAt: {} }))).toBeNull()
  })

  it('tells the author what the owner decided, only when the owner asks', () => {
    const decided = (status: string, over: Record<string, Field> = {}) =>
      offer({ status: s(status), decidedAt: t(NOW - 1000), ...over })
    const ask = (caller: string, o = decided('accepted')) =>
      suggestionPush('answer', caller, 'p1', 's1_vera', plan, o, NOW)
    expect(ask('owner')).toMatchObject({ uid: 'vera', kind: 'accepted', from: 'Olga' })
    expect(ask('owner', decided('rejected'))).toMatchObject({ kind: 'rejected' })
    expect(ask('vera')).toBeNull()
    expect(ask('owner', offer())).toBeNull() // still pending: nothing was answered
    expect(ask('owner', decided('accepted', { decidedAt: t(NOW - FRESH_MS - 1) }))).toBeNull()
  })

  it('only for movie marathons', () => {
    expect(
      suggestionPush(
        'proposal',
        'vera',
        'p1',
        's1_vera',
        { ...plan, kind: s('series') },
        offer(),
        NOW,
      ),
    ).toBeNull()
  })
})

describe('resolveSuggestion', () => {
  const env = { ...process.env }
  beforeEach(() => {
    process.env.RESEND_API_KEY = 'x'
    process.env.RESEND_FROM = 'a@b.c'
    process.env.VITE_FIREBASE_API_KEY = 'key'
    process.env.VITE_FIREBASE_PROJECT_ID = 'demo'
    vi.useFakeTimers({ now: NOW })
  })
  afterEach(() => {
    process.env = { ...env }
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  /** Identity Toolkit says who the token is; Firestore serves the plan and the suggestion. */
  function stubFirebase(uid: string, docs: Record<string, Record<string, Field> | null>) {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (String(url).includes('accounts:lookup')) {
          return Response.json({
            users: [{ localId: uid, email: `${uid}@x.io`, emailVerified: true }],
          })
        }
        const path = Object.keys(docs).find((p) => String(url).endsWith(`/documents/${p}`))
        const fields = path ? docs[path] : null
        return fields
          ? Response.json({ fields, updateTime: 'x' })
          : new Response('{}', { status: 403 })
      }),
    )
  }
  const req = (body: object, token = 'tok') =>
    new Request('http://localhost/api/push-notify', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  const input = { id: 'p1', proposalId: 's1_vera' }
  const docs = { 'plans/p1': plan, 'plans/p1/proposals/s1_vera': offer() }

  it('resolves the owner as the recipient for the author', async () => {
    stubFirebase('vera', docs)
    expect(await resolveSuggestion(req(input), 'proposal', input)).toMatchObject({ uid: 'owner' })
  })

  it('answers 403 when the caller cannot read the plan or the suggestion', async () => {
    stubFirebase('vera', { ...docs, 'plans/p1': null })
    const res = await resolveSuggestion(req(input), 'proposal', input)
    expect(res).toBeInstanceOf(Response)
    expect((res as Response).status).toBe(403)
  })

  it('answers 403 when the stored suggestion belongs to someone else', async () => {
    stubFirebase('mallory', docs)
    expect(((await resolveSuggestion(req(input), 'proposal', input)) as Response).status).toBe(403)
  })

  it('answers 400 for odd ids and 401 without a token', async () => {
    stubFirebase('vera', docs)
    const bad = { id: '../x', proposalId: 's1_vera' }
    expect(((await resolveSuggestion(req(bad), 'proposal', bad)) as Response).status).toBe(400)
    const none = new Request('http://localhost/x', { method: 'POST', body: '{}' })
    expect(((await resolveSuggestion(none, 'proposal', input)) as Response).status).toBe(401)
  })
})
