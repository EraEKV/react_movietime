import { describe, expect, it } from 'vitest'
import type { LibraryStatus } from '../types/library'
import type { MediaKey } from '../types/media'
import type { CollectionPart } from '../types/tmdb'
import { filmToListMedia, filmsByDate, splitFilms, toFilm, yearSpan } from './collection'
import { seenProgress } from './person'

const TODAY = '2026-11-09'

const part = (
  id: number,
  date: string | undefined,
  over: Partial<CollectionPart> = {},
): CollectionPart => ({
  id,
  title: `Film ${id}`,
  overview: '',
  poster_path: `/p${id}.jpg`,
  release_date: date as string,
  vote_average: 7,
  popularity: 1,
  genre_ids: [28],
  ...over,
})

describe('filmsByDate', () => {
  it('sorts by release date whatever order TMDB sent', () => {
    const films = filmsByDate([part(3, '2005-05-19'), part(1, '1977-05-25'), part(2, '1980-05-21')])
    expect(films.map((f) => f.id)).toEqual([1, 2, 3])
  })

  it('puts films without a date last, in a stable order', () => {
    const films = filmsByDate([part(9, ''), part(2, undefined), part(1, '2001-01-01')])
    expect(films.map((f) => f.id)).toEqual([1, 2, 9])
  })

  it('breaks a same-day tie by title and then by id', () => {
    const films = filmsByDate([
      part(5, '2000-01-01', { title: 'B' }),
      part(4, '2000-01-01', { title: 'A' }),
      part(3, '2000-01-01', { title: 'A' }),
    ])
    expect(films.map((f) => f.id)).toEqual([3, 4, 5])
  })

  it('does not change the input', () => {
    const input = [part(2, '2010-01-01'), part(1, '2000-01-01')]
    filmsByDate(input)
    expect(input.map((p) => p.id)).toEqual([2, 1])
  })
})

describe('splitFilms', () => {
  it('treats today as released, and a future or missing date as upcoming', () => {
    const films = filmsByDate([
      part(1, '2000-01-01'),
      part(2, TODAY),
      part(3, '2030-01-01'),
      part(4, ''),
    ])
    const { released, upcoming } = splitFilms(films, TODAY)
    expect(released.map((f) => f.id)).toEqual([1, 2])
    expect(upcoming.map((f) => f.id)).toEqual([3, 4])
  })
})

describe('yearSpan', () => {
  it('shows the first and the last year, or one year, or nothing', () => {
    expect(yearSpan(filmsByDate([part(1, '1999-03-31'), part(2, '2021-12-22')]))).toBe('1999–2021')
    expect(yearSpan(filmsByDate([part(1, '2010-01-01'), part(2, '2010-12-01')]))).toBe('2010')
    expect(yearSpan(filmsByDate([part(1, '')]))).toBeNull()
    expect(yearSpan([])).toBeNull()
  })
})

describe('collection progress', () => {
  it('counts completed released films, plan films separately, and ignores the rest', () => {
    const films = filmsByDate([
      part(1, '2000-01-01'),
      part(2, '2001-01-01'),
      part(3, '2002-01-01'),
      part(4, '2030-01-01'),
    ])
    const { released } = splitFilms(films, TODAY)
    const statuses = new Map<MediaKey, LibraryStatus>([
      ['movie_1', 'completed'],
      ['movie_2', 'plan'],
      ['movie_3', 'dropped'],
      ['movie_4', 'completed'], // not out yet: not counted
    ])
    expect(seenProgress(released, statuses)).toEqual({ seen: 1, planned: 1, total: 3 })
  })
})

describe('snapshots', () => {
  it('maps a film to the list snapshot', () => {
    expect(filmToListMedia(toFilm(part(7, '1999-03-31', { vote_average: 0 })))).toEqual({
      mediaType: 'movie',
      tmdbId: 7,
      title: 'Film 7',
      posterPath: '/p7.jpg',
      year: '1999',
      genreIds: [28],
      tmdbRating: null,
    })
  })
})
