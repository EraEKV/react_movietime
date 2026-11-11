import { afterEach, describe, expect, it, vi } from 'vitest'
import { siteOrigin } from './site.js'

const at = (url: string) => siteOrigin(new Request(url))

describe('siteOrigin', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('uses SITE_URL whatever address the request came to', () => {
    vi.stubEnv('SITE_URL', 'https://avleron.example')
    expect(at('https://app.pages.dev/api/send-invite')).toBe('https://avleron.example')
    expect(at('http://localhost:5173/api/ics')).toBe('https://avleron.example')
  })

  it('drops trailing slashes and spaces from SITE_URL', () => {
    vi.stubEnv('SITE_URL', ' https://avleron.example/ ')
    expect(at('https://x.test/api/ics')).toBe('https://avleron.example')
  })

  it('falls back to the origin of the request when SITE_URL is unset or empty', () => {
    vi.stubEnv('SITE_URL', '')
    expect(at('https://avleron.example/api/send-welcome')).toBe('https://avleron.example')
    expect(at('http://localhost:5173/api/send-welcome')).toBe('http://localhost:5173')
  })
})
