import { afterEach, describe, expect, it, vi } from 'vitest'
import { isChunkError, recoverOnce } from './staleApp'

describe('isChunkError', () => {
  it.each([
    'Failed to fetch dynamically imported module: https://x/assets/Page-abc.js',
    'error loading dynamically imported module',
    'Importing a module script failed.',
  ])('recognises "%s"', (message) => {
    expect(isChunkError(new TypeError(message))).toBe(true)
  })

  it('ignores other errors', () => {
    expect(isChunkError(new Error('x is undefined'))).toBe(false)
    expect(isChunkError('Failed to fetch')).toBe(false)
  })
})

describe('recoverOnce', () => {
  afterEach(() => {
    sessionStorage.clear()
    vi.restoreAllMocks()
  })

  it('does nothing offline, so the error is shown instead', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    expect(recoverOnce()).toBe(false)
  })

  it('refreshes once and then refuses for a minute, so it cannot loop', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    expect(recoverOnce()).toBe(true)
    expect(recoverOnce()).toBe(false)
  })
})
