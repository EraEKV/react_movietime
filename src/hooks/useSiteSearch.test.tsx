import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSiteSearch } from './useSiteSearch'

const tmdbGet = vi.fn()

vi.mock('../shared/api/tmdb', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  tmdbGet: (path: string, options: unknown) => tmdbGet(path, options),
}))

const page = <T,>(results: T[]) => ({
  page: 1,
  results,
  total_pages: 1,
  total_results: results.length,
})

/** Answers each search endpoint from a table; a missing or Error entry makes it fail. */
function answers(table: Record<string, unknown>) {
  tmdbGet.mockImplementation((path: string) => {
    const hit = Object.entries(table).find(([prefix]) => path.startsWith(prefix))?.[1]
    return hit instanceof Error || hit === undefined
      ? Promise.reject(hit ?? new Error('no answer'))
      : Promise.resolve(hit)
  })
}

const movie = {
  id: 1,
  title: 'Dune',
  poster_path: null,
  release_date: '2021-09-15',
  vote_average: 8,
  genre_ids: [],
}
const show = {
  id: 2,
  name: 'Dune: Prophecy',
  poster_path: null,
  first_air_date: '2024-11-17',
  vote_average: 7,
  genre_ids: [],
}
const person = {
  id: 9,
  name: 'Frank Herbert',
  profile_path: null,
  known_for_department: 'Writing',
  popularity: 5,
}
const collection = {
  id: 3,
  name: 'Dune Collection',
  poster_path: '/d.jpg',
  backdrop_path: null,
  overview: '',
}

beforeEach(() => {
  tmdbGet.mockReset()
})

describe('useSiteSearch', () => {
  it('stays idle for a query that is too short', () => {
    const { result } = renderHook(() => useSiteSearch('d'))
    expect(result.current.tooShort).toBe(true)
    expect(result.current.status).toBe('idle')
    expect(tmdbGet).not.toHaveBeenCalled()
  })

  it('returns titles, people and collections together', async () => {
    answers({
      '/search/movie': page([movie]),
      '/search/tv': page([show]),
      '/search/person': page([person]),
      '/search/collection': page([collection]),
    })
    const { result } = renderHook(() => useSiteSearch('dune'))
    await waitFor(() => expect(result.current.status).toBe('success'), { timeout: 3000 })
    const data = result.current.data
    expect(data?.titles.map((t) => t.title)).toEqual(['Dune', 'Dune: Prophecy'])
    expect(data?.people).toEqual([
      { id: 9, name: 'Frank Herbert', photoPath: null, department: 'Writing' },
    ])
    expect(data?.collections).toEqual([{ id: 3, name: 'Dune Collection', posterPath: '/d.jpg' }])
  })

  it('still shows the titles when the people and collection searches fail', async () => {
    answers({
      '/search/movie': page([movie]),
      '/search/tv': page([show]),
      '/search/person': new Error('down'),
      '/search/collection': new Error('down'),
    })
    const { result } = renderHook(() => useSiteSearch('dune'))
    await waitFor(() => expect(result.current.status).toBe('success'), { timeout: 3000 })
    expect(result.current.data?.titles).toHaveLength(2)
    expect(result.current.data?.people).toEqual([])
    expect(result.current.data?.collections).toEqual([])
  })

  it('fails the search when the titles fail', async () => {
    answers({
      '/search/movie': new Error('down'),
      '/search/tv': page([show]),
      '/search/person': page([person]),
      '/search/collection': page([collection]),
    })
    const { result } = renderHook(() => useSiteSearch('dune'))
    await waitFor(() => expect(result.current.status).toBe('error'), { timeout: 3000 })
  })
})
