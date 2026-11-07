import { beforeEach, describe, expect, it } from 'vitest'
import {
  markRedirectStarted,
  redirectPending,
  shouldRedirect,
  takeRedirectMark,
} from './signInMode'

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
const ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36'
const MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.5 Safari/605.1.15'
const WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36'

const env = (userAgent: string, standalone = false, maxTouchPoints = 0) => ({
  standalone,
  userAgent,
  maxTouchPoints,
})

describe('shouldRedirect', () => {
  it('uses a popup in desktop browsers', () => {
    expect(shouldRedirect(env(WINDOWS))).toBe(false)
    expect(shouldRedirect(env(MAC))).toBe(false)
  })

  it('redirects on phones, including an installed app', () => {
    expect(shouldRedirect(env(IPHONE))).toBe(true)
    expect(shouldRedirect(env(ANDROID))).toBe(true)
    expect(shouldRedirect(env(IPHONE, true))).toBe(true)
  })

  it('redirects in any installed app, even on desktop', () => {
    expect(shouldRedirect(env(WINDOWS, true))).toBe(true)
  })

  it('recognises an iPad that reports itself as a Mac', () => {
    expect(shouldRedirect(env(MAC, false, 5))).toBe(true)
  })
})

describe('redirect mark', () => {
  beforeEach(() => localStorage.clear())

  it('is taken once per started redirect', () => {
    expect(redirectPending()).toBe(false)
    expect(takeRedirectMark()).toBe(false)
    markRedirectStarted()
    expect(redirectPending()).toBe(true)
    expect(takeRedirectMark()).toBe(true)
    expect(redirectPending()).toBe(false)
    expect(takeRedirectMark()).toBe(false)
  })
})
