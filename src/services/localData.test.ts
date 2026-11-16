import { beforeEach, describe, expect, it, vi } from 'vitest'

const calls: string[] = []
const terminate = vi.fn(async () => void calls.push('terminate'))
const clearIndexedDbPersistence = vi.fn(async () => void calls.push('clear'))

vi.mock('firebase/firestore', () => ({ terminate, clearIndexedDbPersistence }))
vi.mock('./firestore', () => ({ db: {} }))

const { clearAccountData } = await import('./localData')

describe('clearAccountData', () => {
  beforeEach(() => {
    calls.length = 0
    localStorage.clear()
  })

  it('stops Firestore before deleting its cache', async () => {
    await clearAccountData()
    expect(calls).toEqual(['terminate', 'clear'])
  })

  it('removes the per-account flags and keeps the device settings', async () => {
    localStorage.setItem('movietime.welcomed.abc', '1')
    localStorage.setItem('movietime.preferences.v1', '{}')
    await clearAccountData()
    expect(localStorage.getItem('movietime.welcomed.abc')).toBeNull()
    expect(localStorage.getItem('movietime.preferences.v1')).toBe('{}')
  })

  it('does not throw when the cache cannot be deleted', async () => {
    clearIndexedDbPersistence.mockRejectedValueOnce(new Error('another tab'))
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    await expect(clearAccountData()).resolves.toBeUndefined()
  })
})
