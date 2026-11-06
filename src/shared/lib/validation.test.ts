import { describe, expect, it } from 'vitest'
import {
  passwordRules,
  validateDisplayName,
  validateEmail,
  validateNewPassword,
  validatePasswordConfirm,
} from './validation'

describe('validateEmail', () => {
  it('accepts a normal address, trimmed', () => {
    expect(validateEmail('  a@b.co ')).toBeNull()
  })
  it.each(['', 'abc', 'a@b', 'a b@c.com', '@c.com'])('rejects %j', (value) => {
    expect(validateEmail(value)).toEqual(expect.any(String))
  })
})

describe('password rules', () => {
  const met = (value: string) =>
    Object.fromEntries(passwordRules(value).map((rule) => [rule.id, rule.met]))

  it('reports each rule separately', () => {
    expect(met('abcdefgh')).toEqual({ length: true, digit: false, special: false })
    expect(met('a1!')).toEqual({ length: false, digit: true, special: true })
  })
  it('needs 8+ characters, a digit and a special character', () => {
    expect(validateNewPassword('abcdefg1')).not.toBeNull()
    expect(validateNewPassword('abcdefg!')).not.toBeNull()
    expect(validateNewPassword('abc1!')).not.toBeNull()
    expect(validateNewPassword('abcdef1!')).toBeNull()
  })
  it('compares the confirmation', () => {
    expect(validatePasswordConfirm('abcdef1!', '')).not.toBeNull()
    expect(validatePasswordConfirm('abcdef1!', 'abcdef1?')).not.toBeNull()
    expect(validatePasswordConfirm('abcdef1!', 'abcdef1!')).toBeNull()
  })
})

describe('validateDisplayName', () => {
  it('limits the length after trimming', () => {
    expect(validateDisplayName(' a ')).not.toBeNull()
    expect(validateDisplayName('Ab')).toBeNull()
    expect(validateDisplayName('x'.repeat(41))).not.toBeNull()
  })
})
