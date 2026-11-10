import { describe, expect, it } from 'vitest'
import { feedUrl, isFeedToken, newFeedToken } from './calendarFeed'

describe('newFeedToken', () => {
  it('makes 32 URL-safe characters the rules accept', () => {
    for (let i = 0; i < 50; i++) expect(isFeedToken(newFeedToken())).toBe(true)
  })
  it('turns the base64 characters + and / into - and _', () => {
    // 0xfb 0xff… encodes to "+/" in plain base64.
    const token = newFeedToken((bytes) => bytes.fill(0xfb))
    expect(token).not.toMatch(/[+/=]/)
    expect(token).toBe('-_v7-_v7-_v7-_v7-_v7-_v7-_v7-_v7'.slice(0, 32))
  })
  it('does not repeat', () => {
    expect(new Set(Array.from({ length: 20 }, () => newFeedToken())).size).toBe(20)
  })
})

describe('isFeedToken', () => {
  it('rejects the wrong length and characters', () => {
    expect(isFeedToken('a'.repeat(31))).toBe(false)
    expect(isFeedToken('a'.repeat(33))).toBe(false)
    expect(isFeedToken(`${'a'.repeat(31)}=`)).toBe(false)
    expect(isFeedToken(null)).toBe(false)
  })
})

describe('feedUrl', () => {
  it('ends in .ics so calendar apps take it as a calendar', () => {
    expect(feedUrl('https://app.example', 'a'.repeat(32))).toBe(
      `https://app.example/api/calendar/${'a'.repeat(32)}.ics`,
    )
  })
})
