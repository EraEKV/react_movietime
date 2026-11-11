import { describe, expect, it } from 'vitest'
import { resolveAuthDomain } from './authDomain'

const CONFIGURED = 'movietime-c83d7.firebaseapp.com'

describe('resolveAuthDomain', () => {
  it('uses the page host on the production domain, whatever the build says', () => {
    expect(resolveAuthDomain(CONFIGURED, { hostname: 'avleron.com', host: 'avleron.com' })).toBe(
      'avleron.com',
    )
    expect(resolveAuthDomain(undefined, { hostname: 'avleron.com', host: 'avleron.com' })).toBe(
      'avleron.com',
    )
  })

  it('keeps the configured domain on localhost, previews and workers.dev', () => {
    for (const host of [
      'localhost:5173',
      'react-movietime.kokenaoerasyl.workers.dev',
      'www.avleron.com',
    ]) {
      expect(resolveAuthDomain(CONFIGURED, { hostname: host.split(':')[0] ?? host, host })).toBe(
        CONFIGURED,
      )
    }
  })

  it('keeps the configured domain when there is no page (tests, tooling)', () => {
    expect(resolveAuthDomain(CONFIGURED, undefined)).toBe(CONFIGURED)
  })
})
