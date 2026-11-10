import { describe, expect, it } from 'vitest'
import { SITE_URL, siteOrigin } from './site.js'

const at = (url: string) => siteOrigin(new Request(url))

describe('siteOrigin', () => {
  it('sends vercel.app visitors to the main domain', () => {
    expect(at('https://react-movietime.vercel.app/api/send-invite')).toBe(SITE_URL)
    expect(at('https://react-movietime-git-feat-x.vercel.app/api/ics')).toBe(SITE_URL)
  })

  it('keeps the main domain, a custom domain and localhost as they are', () => {
    expect(at('https://avleron.com/api/send-welcome')).toBe('https://avleron.com')
    expect(at('https://www.avleron.com/api/send-welcome')).toBe('https://www.avleron.com')
    expect(at('http://localhost:5173/api/send-welcome')).toBe('http://localhost:5173')
  })

  it('is not fooled by a lookalike host', () => {
    expect(at('https://vercel.app.evil.test/api/x')).toBe('https://vercel.app.evil.test')
  })
})
