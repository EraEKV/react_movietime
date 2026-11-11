import { generateKeyPairSync } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { encryptMessage, fromBase64Url, toBase64Url, vapidHeader } from './webPush.js'

// RFC 8291, appendix A: the example message with its fixed keys, salt and the exact body.
const RFC = {
  message: 'When I grow up, I want to be a watermelon',
  senderPrivate: 'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw',
  senderPublic:
    'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8',
  userPublic:
    'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',
  auth: 'BTBZMqHH6r4Tts7J_aSIgg',
  salt: 'DGv6ra1nlYgDCS1FRnbzlw',
  body: 'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN',
}

describe('encryptMessage', () => {
  it('produces the body of the RFC 8291 example', async () => {
    const publicBytes = fromBase64Url(RFC.senderPublic)
    const params = { name: 'ECDH', namedCurve: 'P-256' }
    const privateKey = await crypto.subtle.importKey(
      'jwk',
      {
        kty: 'EC',
        crv: 'P-256',
        d: RFC.senderPrivate,
        x: toBase64Url(publicBytes.slice(1, 33)),
        y: toBase64Url(publicBytes.slice(33, 65)),
      },
      params,
      false,
      ['deriveBits'],
    )
    const publicKey = await crypto.subtle.importKey('raw', publicBytes, params, true, [])
    const body = await encryptMessage(
      new TextEncoder().encode(RFC.message),
      { p256dh: RFC.userPublic, auth: RFC.auth },
      { keys: { privateKey, publicKey }, salt: fromBase64Url(RFC.salt) },
    )
    expect(toBase64Url(body)).toBe(RFC.body)
  })

  it('refuses a message that does not fit one record', async () => {
    const { publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' })
    const raw = publicKey.export({ format: 'der', type: 'spki' }).subarray(-65)
    await expect(
      encryptMessage(new Uint8Array(4000), { p256dh: toBase64Url(raw), auth: RFC.auth }),
    ).rejects.toThrow(RangeError)
  })
})

describe('vapidHeader', () => {
  it('signs a JWT for the push service origin that verifies with the public key', async () => {
    const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
      'sign',
      'verify',
    ])
    const publicKey = toBase64Url(
      new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey)),
    )
    const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey)
    const header = await vapidHeader('https://push.example.test/send/abc', {
      subject: 'mailto:a@example.test',
      publicKey,
      privateKey: jwk.d ?? '',
    })

    const match = /^vapid t=([\w-]+)\.([\w-]+)\.([\w-]+), k=(.+)$/.exec(header)
    expect(match?.[4]).toBe(publicKey)
    const [, head, claims, signature] = match ?? []
    expect(JSON.parse(new TextDecoder().decode(fromBase64Url(claims ?? '')))).toMatchObject({
      aud: 'https://push.example.test',
      sub: 'mailto:a@example.test',
    })
    const valid = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      pair.publicKey,
      fromBase64Url(signature ?? ''),
      new TextEncoder().encode(`${head}.${claims}`),
    )
    expect(valid).toBe(true)
  })
})
