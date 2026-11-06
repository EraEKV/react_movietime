import { describe, expect, it } from 'vitest'
import { inviteMailto, invitePath, inviteUrl, parseInvite } from './invite'

describe('parseInvite', () => {
  it('accepts a list or plan id', () => {
    expect(parseInvite('lists/aB12')).toEqual({ collection: 'lists', id: 'aB12' })
    expect(parseInvite('plans/xyz')).toEqual({ collection: 'plans', id: 'xyz' })
  })

  it.each([
    null,
    '',
    'users/abc',
    'lists/',
    'lists/a/b',
    '/lists/abc',
    'lists/../x',
    'https://evil.site',
    '//evil.site',
    'lists/abc?x=1',
    `lists/${'a'.repeat(65)}`,
  ])('rejects %j', (value) => {
    expect(parseInvite(value)).toBeNull()
    expect(invitePath(value)).toBeUndefined()
  })
})

describe('invite links', () => {
  it('leads to the list or the planner page', () => {
    expect(invitePath('lists/abc')).toBe('/lists/abc')
    expect(invitePath('plans/abc')).toBe('/planner/abc')
  })

  it('builds a sign-up link with the lowercase email, and it parses back', () => {
    const url = new URL(inviteUrl('plans', 'p1', ' Dan+Tag@Example.com '))
    expect(url.pathname).toBe('/signup')
    expect(url.searchParams.get('invite')).toBe('plans/p1')
    expect(url.searchParams.get('email')).toBe('dan+tag@example.com')
    expect(parseInvite(url.searchParams.get('invite'))).toEqual({ collection: 'plans', id: 'p1' })
  })

  it('builds a mailto with an escaped subject and body', () => {
    const href = inviteMailto('Dan@Example.com', 'Hi & bye', 'Line 1\nLine 2')
    expect(href).toBe('mailto:dan%40example.com?subject=Hi%20%26%20bye&body=Line%201%0ALine%202')
  })
})
