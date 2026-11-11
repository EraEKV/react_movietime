import { generateKeyPairSync } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { adminDb, fromValue, toValue } from './admin.js'

const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })

interface Call {
  method: string
  url: string
  body: unknown
  auth: string | null
}

let calls: Call[]
let answers: ((url: string) => Response | undefined)[]

beforeEach(() => {
  calls = []
  answers = []
  vi.stubEnv(
    'FIREBASE_SERVICE_ACCOUNT',
    JSON.stringify({
      project_id: 'demo',
      client_email: 'robot@demo.iam.gserviceaccount.com',
      private_key: privateKey.export({ format: 'pem', type: 'pkcs8' }),
    }),
  )
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      if (url.startsWith('https://oauth2.googleapis.com/token')) {
        return Response.json({ access_token: 'token-1', expires_in: 3600 })
      }
      const headers = new Headers(init?.headers)
      calls.push({
        method: init?.method ?? 'GET',
        url,
        body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
        auth: headers.get('authorization'),
      })
      for (const answer of answers) {
        const response = answer(url)
        if (response) return response
      }
      return Response.json(url.endsWith(':runQuery') ? [] : {})
    }),
  )
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('Firestore values', () => {
  it('round-trips every type the endpoints store', () => {
    const data = {
      uid: 'u1',
      count: 3,
      ratio: 0.5,
      done: false,
      none: null,
      at: new Date('2026-11-11T10:00:00.000Z'),
      keys: { p256dh: 'a', auth: 'b' },
      list: ['x', 2],
    }
    expect(fromValue(toValue(data))).toEqual(data)
  })

  it('writes integers and doubles in their own fields', () => {
    expect(toValue(4)).toEqual({ integerValue: '4' })
    expect(toValue(4.5)).toEqual({ doubleValue: 4.5 })
  })
})

describe('adminDb', () => {
  it('is null without a service account', () => {
    vi.stubEnv('FIREBASE_SERVICE_ACCOUNT', '')
    expect(adminDb()).toBeNull()
  })

  it('runs a filtered query against the collection and returns documents with ids', async () => {
    answers.push((url) =>
      url.endsWith(':runQuery')
        ? Response.json([
            {
              document: {
                name: 'projects/demo/databases/(default)/documents/users/abc',
                fields: {
                  icsTimeZone: { stringValue: 'Asia/Almaty' },
                  a: { mapValue: { fields: { b: { stringValue: 'deep' } } } },
                },
              },
            },
            { readTime: '2026-11-11T10:00:00Z' },
          ])
        : undefined,
    )
    const snap = await adminDb()!.collection('users').where('icsToken', '==', 'tok').limit(1).get()

    expect(snap.docs).toHaveLength(1)
    expect(snap.docs[0]?.id).toBe('abc')
    expect(snap.docs[0]?.get('icsTimeZone')).toBe('Asia/Almaty')
    expect(snap.docs[0]?.get('a.b')).toBe('deep')
    expect(calls[0]).toMatchObject({
      method: 'POST',
      url: 'https://firestore.googleapis.com/v1/projects/demo/databases/(default)/documents:runQuery',
      auth: 'Bearer token-1',
      body: {
        structuredQuery: {
          from: [{ collectionId: 'users' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'icsToken' },
              op: 'EQUAL',
              value: { stringValue: 'tok' },
            },
          },
          limit: 1,
        },
      },
    })
  })

  it('queries a subcollection through the parent document', async () => {
    await adminDb()!
      .collection('plans')
      .doc('p1')
      .collection('sessions')
      .where('status', '==', 'pending')
      .get()
    expect(calls[0]?.url).toBe(
      'https://firestore.googleapis.com/v1/projects/demo/databases/(default)/documents/plans/p1:runQuery',
    )
    expect(calls[0]?.body).toMatchObject({
      structuredQuery: { from: [{ collectionId: 'sessions' }] },
    })
  })

  it('uses array-contains for the shared plans query', async () => {
    await adminDb()!.collection('plans').where('memberEmails', 'array-contains', 'a@b.c').get()
    expect(calls[0]?.body).toMatchObject({
      structuredQuery: { where: { fieldFilter: { op: 'ARRAY_CONTAINS' } } },
    })
  })

  it('replaces a document with set and reads missing ones as not existing', async () => {
    const db = adminDb()!
    await db.collection('pushSubscriptions').doc('h1').set({ uid: 'u1', n: 1 })
    expect(calls[0]).toMatchObject({
      method: 'PATCH',
      url: 'https://firestore.googleapis.com/v1/projects/demo/databases/(default)/documents/pushSubscriptions/h1',
      body: { fields: { uid: { stringValue: 'u1' }, n: { integerValue: '1' } } },
    })

    answers.push(() => new Response('{}', { status: 404 }))
    const missing = await db.collection('pushSubscriptions').doc('nope').get()
    expect(missing.exists).toBe(false)
    expect(missing.get('uid')).toBeUndefined()
  })

  it('deletes through the snapshot reference and treats an already gone document as done', async () => {
    answers.push(() => new Response('{}', { status: 404 }))
    await adminDb()!.collection('pushSubscriptions').doc('gone').delete()
    expect(calls[0]).toMatchObject({ method: 'DELETE' })
  })

  it('throws when Firestore refuses', async () => {
    answers.push(() => new Response('{}', { status: 403 }))
    await expect(adminDb()!.collection('users').get()).rejects.toThrow('403')
  })
})
