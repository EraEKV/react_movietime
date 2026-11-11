// Web Push (RFC 8030) with VAPID (RFC 8292) and message encryption (RFC 8291, aes128gcm),
// written on fetch and WebCrypto so it runs on Node, Vercel and Cloudflare Workers alike.
// The `web-push` package needs Node's https and crypto modules.

import type { webcrypto } from 'node:crypto'

export interface PushSubscription {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

export interface Vapid {
  subject: string
  publicKey: string
  privateKey: string
}

const encoder = new TextEncoder()
const RECORD_SIZE = 4096
/** Header (salt, record size, key length) plus key (65) plus the GCM tag (16) plus padding (1). */
const MAX_MESSAGE = RECORD_SIZE - 86 - 16 - 1

export const toBase64Url = (bytes: Uint8Array | string): string => {
  const data = typeof bytes === 'string' ? encoder.encode(bytes) : bytes
  let binary = ''
  for (const byte of data) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export const fromBase64Url = (text: string): Uint8Array<ArrayBuffer> =>
  Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))

const concat = (...parts: Uint8Array[]): Uint8Array<ArrayBuffer> => {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0))
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

async function hkdf(
  salt: Uint8Array,
  secret: ArrayBuffer | Uint8Array,
  info: Uint8Array,
  bytes: number,
): Promise<Uint8Array<ArrayBuffer>> {
  const key = await crypto.subtle.importKey('raw', secret, 'HKDF', false, ['deriveBits'])
  return new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, bytes * 8),
  )
}

/** Fixed values for the test against the RFC's example; real sends leave this out. */
export interface Fixed {
  keys?: webcrypto.CryptoKeyPair
  salt?: Uint8Array
}

/** The request body for one push message: salt, record size, sender key, encrypted record. */
export async function encryptMessage(
  message: Uint8Array,
  subscription: PushSubscription['keys'],
  fixed?: Fixed,
): Promise<Uint8Array<ArrayBuffer>> {
  if (message.length > MAX_MESSAGE) throw new RangeError('The push message is too long')
  const userPublic = fromBase64Url(subscription.p256dh)
  const authSecret = fromBase64Url(subscription.auth)

  const sender =
    fixed?.keys ??
    (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']))
  const senderPublic = new Uint8Array(await crypto.subtle.exportKey('raw', sender.publicKey))
  const userKey = await crypto.subtle.importKey(
    'raw',
    userPublic,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  )
  const shared = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: userKey },
    sender.privateKey,
    256,
  )

  const secret = await hkdf(
    authSecret,
    shared,
    concat(encoder.encode('WebPush: info\0'), userPublic, senderPublic),
    32,
  )
  const salt = fixed?.salt ?? crypto.getRandomValues(new Uint8Array(16))
  const contentKey = await hkdf(salt, secret, encoder.encode('Content-Encoding: aes128gcm\0'), 16)
  const nonce = await hkdf(salt, secret, encoder.encode('Content-Encoding: nonce\0'), 12)

  const key = await crypto.subtle.importKey('raw', contentKey, 'AES-GCM', false, ['encrypt'])
  // 0x02 closes the last (here: only) record.
  const record = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: nonce },
      key,
      concat(message, new Uint8Array([2])),
    ),
  )

  const header = new Uint8Array(21)
  header.set(salt)
  new DataView(header.buffer).setUint32(16, RECORD_SIZE)
  header[20] = senderPublic.length
  return concat(header, senderPublic, record)
}

/** The `Authorization` value that proves the sender owns the VAPID key. */
export async function vapidHeader(endpoint: string, vapid: Vapid): Promise<string> {
  const publicBytes = fromBase64Url(vapid.publicKey)
  const key = await crypto.subtle.importKey(
    'jwk',
    {
      kty: 'EC',
      crv: 'P-256',
      d: vapid.privateKey,
      x: toBase64Url(publicBytes.slice(1, 33)),
      y: toBase64Url(publicBytes.slice(33, 65)),
    },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  )
  const unsigned = `${toBase64Url(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))}.${toBase64Url(
    JSON.stringify({
      aud: new URL(endpoint).origin,
      exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
      sub: vapid.subject,
    }),
  )}`
  // WebCrypto signs ECDSA as the plain r‖s pair, which is the form a JWT wants.
  const signature = new Uint8Array(
    await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, encoder.encode(unsigned)),
  )
  return `vapid t=${unsigned}.${toBase64Url(signature)}, k=${vapid.publicKey}`
}

/** Sends one message and returns the push service's status (201 sent, 404/410 gone). */
export async function sendNotification(
  subscription: PushSubscription,
  message: string,
  vapid: Vapid,
  options: { ttl?: number; timeout?: number } = {},
): Promise<number> {
  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      authorization: await vapidHeader(subscription.endpoint, vapid),
      'content-encoding': 'aes128gcm',
      'content-type': 'application/octet-stream',
      ttl: String(options.ttl ?? 24 * 60 * 60),
    },
    body: await encryptMessage(encoder.encode(message), subscription.keys),
    signal: AbortSignal.timeout(options.timeout ?? 8000),
  })
  return response.status
}
