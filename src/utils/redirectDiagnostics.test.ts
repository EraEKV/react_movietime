import { describe, expect, it } from 'vitest'
import { describeRedirect, deviceKind } from './redirectDiagnostics'

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'
const ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36'

describe('redirect diagnostics', () => {
  it('names the device and flags in-app web views', () => {
    expect(deviceKind(IPHONE)).toBe('iOS')
    expect(deviceKind(ANDROID)).toBe('Android')
    expect(deviceKind('Mozilla/5.0 (Macintosh) Chrome/130')).toBe('desktop')
    expect(deviceKind(`${IPHONE} Instagram 300.0`)).toBe('iOS in-app')
    expect(deviceKind('Mozilla/5.0 (Linux; Android 14; wv) Chrome/130')).toBe('Android in-app')
  })

  it('puts the facts on one line, keeping only hosts of the referrer', () => {
    expect(
      describeRedirect({
        host: 'avleron.com',
        authDomain: 'avleron.com',
        standalone: false,
        referrer: 'https://accounts.google.com/o/oauth2/v2/auth?client_id=secret',
        userAgent: IPHONE,
      }),
    ).toBe('avleron.com · auth avleron.com · browser · from accounts.google.com · iOS')
  })

  it('copes with a missing referrer and auth domain', () => {
    expect(
      describeRedirect({
        host: 'avleron.com',
        authDomain: undefined,
        standalone: true,
        referrer: '',
        userAgent: ANDROID,
      }),
    ).toBe('avleron.com · auth - · app · from - · Android')
  })
})
