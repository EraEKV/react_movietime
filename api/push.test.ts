import { beforeEach, describe, expect, it, vi } from 'vitest'
import type * as Firebase from './_lib/firebase.js'

const docs = vi.hoisted(() => ({ own: [] as { id: string }[], saved: [] as string[] }))

vi.mock('./_lib/admin.js', () => ({
  SUBSCRIPTIONS: 'pushSubscriptions',
  adminDb: () => ({
    collection: () => ({
      where: () => ({ limit: () => ({ get: async () => ({ docs: docs.own }) }) }),
      doc: (id: string) => ({
        set: async () => void docs.saved.push(id),
        get: async () => ({ exists: false }),
        delete: async () => {},
      }),
    }),
  }),
}))
vi.mock('./_lib/firebase.js', async (importOriginal) => ({
  ...(await importOriginal<typeof Firebase>()),
  readEnv: () => ({}),
  verifyToken: async () => ({ uid: 'u1', email: 'a@x.io', emailVerified: true, displayName: '' }),
}))

import { createHash } from 'node:crypto'
import { POST } from './push'

const subscription = (n: number) => ({
  endpoint: `https://push.example/${n}`,
  keys: { p256dh: 'p', auth: 'a' },
})
const idOf = (n: number) => createHash('sha256').update(subscription(n).endpoint).digest('hex')
const post = (body: unknown, raw?: string) =>
  POST(
    new Request('https://avleron.com/api/push', {
      method: 'POST',
      headers: { authorization: 'Bearer header0000.payload0000.signature00' },
      body: raw ?? JSON.stringify(body),
    }),
  )

beforeEach(() => {
  docs.own = []
  docs.saved = []
})

describe('POST /api/push', () => {
  it('stores a new browser', async () => {
    expect((await post({ subscription: subscription(1) })).status).toBe(200)
    expect(docs.saved).toEqual([idOf(1)])
  })

  it('refuses an eleventh browser of one account', async () => {
    docs.own = Array.from({ length: 10 }, (_, i) => ({ id: idOf(100 + i) }))
    expect((await post({ subscription: subscription(1) })).status).toBe(429)
    expect(docs.saved).toEqual([])
  })

  it('lets a stored browser renew itself at the limit', async () => {
    docs.own = Array.from({ length: 10 }, (_, i) => ({ id: idOf(i + 1) }))
    expect((await post({ subscription: subscription(1) })).status).toBe(200)
  })

  it('refuses an oversized body', async () => {
    const big = { subscription: subscription(1), padding: 'x'.repeat(10_000) }
    expect((await post(big)).status).toBe(400)
  })
})
