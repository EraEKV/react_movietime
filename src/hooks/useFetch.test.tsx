import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type * as Tmdb from '../api/tmdb'

const tmdbGet = vi.fn()
vi.mock('../api/tmdb', async (importOriginal) => ({
  ...(await importOriginal<typeof Tmdb>()),
  tmdbGet: (path: string, options: { signal: AbortSignal }) => tmdbGet(path, options),
}))
vi.mock('./useTmdbLanguage', () => ({ useTmdbLanguage: () => 'en-US' }))

import { useFetch } from './useFetch'

/** A request the test resolves by hand, to control the order of responses. */
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('useFetch', () => {
  beforeEach(() => {
    tmdbGet.mockReset()
  })

  it('goes loading → success', async () => {
    tmdbGet.mockResolvedValue({ id: 1 })
    const { result } = renderHook(() => useFetch<{ id: number }>('/tv/1'))
    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(result.current.data).toEqual({ id: 1 })
  })

  it('stays idle without a path and sends no request', () => {
    const { result } = renderHook(() => useFetch(null))
    expect(result.current.status).toBe('idle')
    expect(tmdbGet).not.toHaveBeenCalled()
  })

  it('exposes errors and retries with reload', async () => {
    tmdbGet.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce('ok')
    const { result } = renderHook(() => useFetch<string>('/tv/1'))
    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error?.message).toBe('boom')
    act(() => result.current.reload())
    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(result.current.data).toBe('ok')
  })

  it('ignores a slow response for an old path (race)', async () => {
    const slow = deferred<string>()
    const fast = deferred<string>()
    tmdbGet.mockImplementation((path: string) => (path.includes('/1') ? slow : fast).promise)

    const { result, rerender } = renderHook(({ path }) => useFetch<string>(path), {
      initialProps: { path: '/tv/1' },
    })
    rerender({ path: '/tv/2' })
    await act(async () => fast.resolve('second'))
    await waitFor(() => expect(result.current.data).toBe('second'))
    await act(async () => slow.resolve('first')) // arrives late
    expect(result.current.data).toBe('second')
  })

  it('aborts the previous request when the path changes', () => {
    tmdbGet.mockReturnValue(new Promise(() => {}))
    const { rerender } = renderHook(({ path }) => useFetch(path), { initialProps: { path: '/a' } })
    const firstSignal = tmdbGet.mock.calls[0]![1].signal as AbortSignal
    rerender({ path: '/b' })
    expect(firstSignal.aborted).toBe(true)
  })

  it('does not refetch on a re-render with the same path', () => {
    tmdbGet.mockReturnValue(new Promise(() => {}))
    const { rerender } = renderHook(() => useFetch('/tv/1'))
    rerender()
    rerender()
    expect(tmdbGet).toHaveBeenCalledTimes(1)
  })
})
