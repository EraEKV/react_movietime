// Server-side Firestore and Auth lookups for the endpoints that must read other people's data
// (push subscriptions, the calendar feed). Both go through the REST APIs with fetch and the
// service account's token, signed with WebCrypto. Firebase Admin is not used on purpose: it
// talks gRPC and builds code at run time, which Cloudflare Workers do not allow, and its
// dependency jwks-rsa had already broken on Vercel. The surface mirrors the part of the
// Admin SDK these endpoints use (collection / doc / where / limit / get / set / delete), so
// they read the same. Env: FIREBASE_SERVICE_ACCOUNT = the service-account JSON (one line).
// With FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST set, the emulators are used.

interface ServiceAccount {
  project_id: string
  client_email: string
  private_key: string
}

let account: ServiceAccount | null = null
let cachedToken: { value: string; expires: number } | null = null

const encoder = new TextEncoder()

const toBase64Url = (bytes: Uint8Array | string): string => {
  const data = typeof bytes === 'string' ? encoder.encode(bytes) : bytes
  let binary = ''
  for (const byte of data) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function pemToBytes(pem: string): Uint8Array<ArrayBuffer> {
  const body = pem.replace(/-----[A-Z ]+-----/g, '').replace(/\s+/g, '')
  return Uint8Array.from(atob(body), (c) => c.charCodeAt(0))
}

/** An OAuth access token for the service account (cached until shortly before it expires). */
async function accessToken(): Promise<string | null> {
  if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    return 'owner'
  }
  if (!account) return null
  const now = Math.floor(Date.now() / 1000)
  if (cachedToken && cachedToken.expires - 60 > now) return cachedToken.value

  const claims = {
    iss: account.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }
  const unsigned = `${toBase64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${toBase64Url(
    JSON.stringify(claims),
  )}`
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToBytes(account.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = new Uint8Array(
    await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, encoder.encode(unsigned)),
  )
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${toBase64Url(signature)}`,
    }),
  })
  if (!response.ok) return null
  const body = (await response.json()) as { access_token?: string; expires_in?: number }
  if (!body.access_token) return null
  cachedToken = { value: body.access_token, expires: now + (body.expires_in ?? 3600) }
  return cachedToken.value
}

// Firestore's REST values: { stringValue }, { integerValue: "1" }, { mapValue: { fields } }…

type FirestoreValue = Record<string, unknown>

export function toValue(value: unknown): FirestoreValue {
  if (value === null || value === undefined) return { nullValue: null }
  if (typeof value === 'string') return { stringValue: value }
  if (typeof value === 'boolean') return { booleanValue: value }
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value }
  }
  if (value instanceof Date) return { timestampValue: value.toISOString() }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toValue) } }
  if (typeof value === 'object') {
    return { mapValue: { fields: toFields(value as Record<string, unknown>) } }
  }
  throw new TypeError(`Cannot store a ${typeof value} in Firestore`)
}

const toFields = (data: Record<string, unknown>): Record<string, FirestoreValue> =>
  Object.fromEntries(
    Object.entries(data)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, toValue(value)]),
  )

export function fromValue(value: FirestoreValue): unknown {
  if ('stringValue' in value) return value.stringValue
  if ('integerValue' in value) return Number(value.integerValue)
  if ('doubleValue' in value) return value.doubleValue
  if ('booleanValue' in value) return value.booleanValue
  if ('timestampValue' in value) return new Date(String(value.timestampValue))
  if ('arrayValue' in value) {
    const values = (value.arrayValue as { values?: FirestoreValue[] }).values ?? []
    return values.map(fromValue)
  }
  if ('mapValue' in value) {
    return fromFields((value.mapValue as { fields?: Record<string, FirestoreValue> }).fields ?? {})
  }
  return null
}

const fromFields = (fields: Record<string, FirestoreValue>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, fromValue(value)]))

export interface Snapshot {
  id: string
  exists: boolean
  ref: DocRef
  /** One field, `a.b` reaching into maps. */
  get(path: string): unknown
}

export interface DocRef {
  id: string
  get(): Promise<Snapshot>
  set(data: Record<string, unknown>): Promise<void>
  delete(): Promise<void>
  collection(name: string): Collection
}

export interface Collection {
  doc(id: string): DocRef
  where(field: string, op: '==' | 'array-contains', value: unknown): Collection
  limit(count: number): Collection
  get(): Promise<{ docs: Snapshot[] }>
}

const OPERATORS = { '==': 'EQUAL', 'array-contains': 'ARRAY_CONTAINS' } as const

const lookup = (data: Record<string, unknown>, path: string): unknown =>
  path
    .split('.')
    .reduce<unknown>(
      (node, key) =>
        node && typeof node === 'object' ? (node as Record<string, unknown>)[key] : undefined,
      data,
    )

function firestore(projectId: string) {
  const emulator = process.env.FIRESTORE_EMULATOR_HOST
  const root = `${emulator ? `http://${emulator}` : 'https://firestore.googleapis.com'}/v1/projects/${projectId}/databases/(default)/documents`
  const url = (path: string) =>
    `${root}${path ? `/${path.split('/').map(encodeURIComponent).join('/')}` : ''}`

  async function call(method: string, address: string, body?: object): Promise<Response> {
    const token = await accessToken()
    if (!token) throw new Error('No access token for Firestore')
    return fetch(address, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        ...(body ? { 'content-type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  const ensure = async (response: Response, allow404 = false) => {
    if (response.ok || (allow404 && response.status === 404)) return response
    throw new Error(`Firestore answered ${response.status}`)
  }

  function snapshot(path: string, fields: Record<string, FirestoreValue> | null): Snapshot {
    const data = fields ? fromFields(fields) : {}
    return {
      id: path.slice(path.lastIndexOf('/') + 1),
      exists: fields !== null,
      ref: docRef(path),
      get: (field) => lookup(data, field),
    }
  }

  function docRef(path: string): DocRef {
    return {
      id: path.slice(path.lastIndexOf('/') + 1),
      async get() {
        const response = await ensure(await call('GET', url(path)), true)
        if (response.status === 404) return snapshot(path, null)
        const body = (await response.json()) as { fields?: Record<string, FirestoreValue> }
        return snapshot(path, body.fields ?? {})
      },
      async set(data) {
        // PATCH without an update mask replaces the whole document (and creates it).
        await ensure(await call('PATCH', url(path), { fields: toFields(data) }))
      },
      async delete() {
        await ensure(await call('DELETE', url(path)), true)
      },
      collection: (name) => collectionRef(`${path}/${name}`),
    }
  }

  function collectionRef(
    path: string,
    filter?: { field: string; op: '==' | 'array-contains'; value: unknown },
    max?: number,
  ): Collection {
    return {
      doc: (id) => docRef(`${path}/${id}`),
      where: (field, op, value) => collectionRef(path, { field, op, value }, max),
      limit: (count) => collectionRef(path, filter, count),
      async get() {
        const slash = path.lastIndexOf('/')
        const parent = slash === -1 ? '' : path.slice(0, slash)
        const structuredQuery = {
          from: [{ collectionId: path.slice(slash + 1) }],
          ...(filter && {
            where: {
              fieldFilter: {
                field: { fieldPath: filter.field },
                op: OPERATORS[filter.op],
                value: toValue(filter.value),
              },
            },
          }),
          ...(max !== undefined && { limit: max }),
        }
        const response = await ensure(
          await call('POST', `${url(parent)}:runQuery`, { structuredQuery }),
        )
        const rows = (await response.json()) as {
          document?: { name: string; fields?: Record<string, FirestoreValue> }
        }[]
        return {
          docs: rows.flatMap((row) =>
            row.document
              ? [
                  snapshot(
                    row.document.name.slice(row.document.name.indexOf('/documents/') + 11),
                    row.document.fields ?? {},
                  ),
                ]
              : [],
          ),
        }
      },
    }
  }

  return { collection: (name: string) => collectionRef(name) }
}

export type Db = ReturnType<typeof firestore>

/** Firestore for the service account, or null when it is not configured. */
export function adminDb(): Db | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!raw) return null
  if (!account) account = JSON.parse(raw) as ServiceAccount
  return firestore(account.project_id)
}

/**
 * The Auth account of `uid` as far as the calendar feed needs it (its email and whether that
 * is verified), or null when it can't be read. Asked through the Identity Toolkit REST API
 * with the service account's token. Call adminDb() first, it loads the account.
 */
export async function accountOf(
  uid: string,
): Promise<{ email: string; emailVerified: boolean } | null> {
  if (!account) return null
  const emulator = process.env.FIREBASE_AUTH_EMULATOR_HOST
  const base = emulator
    ? `http://${emulator}/identitytoolkit.googleapis.com`
    : 'https://identitytoolkit.googleapis.com'
  const token = await accessToken()
  if (!token) return null
  const response = await fetch(`${base}/v1/projects/${account.project_id}/accounts:lookup`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ localId: [uid] }),
  })
  if (!response.ok) return null
  const body = (await response.json()) as {
    users?: { email?: string; emailVerified?: boolean }[]
  }
  const user = body.users?.[0]
  return user?.email ? { email: user.email, emailVerified: user.emailVerified === true } : null
}

export const SUBSCRIPTIONS = 'pushSubscriptions'
