import { randomBytes } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { decrypt, encrypt, parseKey, signState, verifyState } from './gcalCrypto'

const key = randomBytes(32)

describe('parseKey', () => {
  it('accepts 32 bytes in base64 and nothing else', () => {
    expect(parseKey(key.toString('base64'))?.length).toBe(32)
    expect(parseKey(randomBytes(16).toString('base64'))).toBeNull()
    expect(parseKey('')).toBeNull()
    expect(parseKey(undefined)).toBeNull()
  })
})

describe('encrypt / decrypt', () => {
  it('round-trips and does not repeat for the same text', () => {
    const a = encrypt('1//refresh-token', key)
    expect(a).not.toContain('refresh-token')
    expect(decrypt(a, key)).toBe('1//refresh-token')
    expect(encrypt('1//refresh-token', key)).not.toBe(a)
  })

  it('refuses a changed value or another key', () => {
    const a = encrypt('secret', key)
    expect(decrypt(a.slice(0, -2) + 'AA', key)).toBeNull()
    expect(decrypt(a, randomBytes(32))).toBeNull()
    expect(decrypt('garbage', key)).toBeNull()
  })
})

describe('state', () => {
  const now = 1_000_000
  it('returns the payload while it is valid', () => {
    const state = signState({ uid: 'u1', exp: now + 1000 }, key)
    expect(verifyState(state, key, now)).toEqual({ uid: 'u1', exp: now + 1000 })
  })

  it('rejects expired, forged and foreign states', () => {
    const state = signState({ uid: 'u1', exp: now + 1000 }, key)
    expect(verifyState(state, key, now + 2000)).toBeNull()
    expect(verifyState(state, randomBytes(32), now)).toBeNull()
    const forged = signState({ uid: 'victim', exp: now + 1000 }, key)
    expect(verifyState(`${forged.split('.')[0]}.${state.split('.')[1]}`, key, now)).toBeNull()
    expect(verifyState('nope', key, now)).toBeNull()
  })
})
