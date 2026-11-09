import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto'

// The refresh token is a long-lived key to someone's calendar, so it is stored encrypted
// (AES-256-GCM, key = CALENDAR_TOKEN_KEY, 32 random bytes in base64) and only the server
// ever decrypts it. The OAuth `state` is signed with the same key, so the callback can trust
// which account started the flow without any session on the server.

/** The key from the env value, or null when it is missing or not 32 bytes. */
export function parseKey(value: string | undefined): Buffer | null {
  if (!value) return null
  const key = Buffer.from(value, 'base64')
  return key.length === 32 ? key : null
}

export function encrypt(plain: string, key: Buffer): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return ['v1', iv, cipher.getAuthTag(), data]
    .map((p) => (typeof p === 'string' ? p : p.toString('base64url')))
    .join('.')
}

/** The original text, or null when the value was changed or the key is wrong. */
export function decrypt(value: string, key: Buffer): string | null {
  const [version, iv, tag, data] = value.split('.')
  if (version !== 'v1' || !iv || !tag || !data) return null
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'))
    decipher.setAuthTag(Buffer.from(tag, 'base64url'))
    return Buffer.concat([
      decipher.update(Buffer.from(data, 'base64url')),
      decipher.final(),
    ]).toString('utf8')
  } catch {
    return null
  }
}

export interface StatePayload {
  uid: string
  /** Epoch milliseconds. */
  exp: number
}

const mac = (body: string, key: Buffer) =>
  createHmac('sha256', key).update(body).digest('base64url')

export function signState(payload: StatePayload, key: Buffer): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${body}.${mac(body, key)}`
}

/** The payload when the signature matches and it has not expired. */
export function verifyState(state: string, key: Buffer, now = Date.now()): StatePayload | null {
  const [body, signature] = state.split('.')
  if (!body || !signature) return null
  const expected = Buffer.from(mac(body, key))
  const given = Buffer.from(signature)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  try {
    const payload = JSON.parse(
      Buffer.from(body, 'base64url').toString('utf8'),
    ) as Partial<StatePayload>
    if (typeof payload.uid !== 'string' || typeof payload.exp !== 'number') return null
    return payload.exp > now ? { uid: payload.uid, exp: payload.exp } : null
  } catch {
    return null
  }
}
