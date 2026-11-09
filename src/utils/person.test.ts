import { describe, expect, it } from 'vitest'
import type { LibraryStatus } from '../types/library'
import type { MediaKey } from '../types/media'
import type { PersonCastCredit, PersonCrewCredit } from '../types/tmdb'
import {
  biographyOf,
  buildFilmography,
  crewRole,
  filterWorks,
  isoDay,
  keyCrew,
  knownFor,
  seenProgress,
  sortUpcoming,
  sortWorks,
  splitReleased,
  type PersonWork,
} from './person'

const TODAY = '2026-11-09'

function movieCast(id: number, over: Partial<PersonCastCredit> = {}): PersonCastCredit {
  return {
    id,
    media_type: 'movie',
    title: `Movie ${id}`,
    release_date: '2000-01-01',
    poster_path: `/m${id}.jpg`,
    popularity: 10,
    vote_average: 7,
    genre_ids: [],
    credit_id: `c${id}`,
    character: 'Hero',
    ...over,
  }
}

function crewCredit(
  id: number,
  job: string,
  over: Partial<PersonCrewCredit> = {},
): PersonCrewCredit {
  return {
    id,
    media_type: 'movie',
    title: `Movie ${id}`,
    release_date: '2000-01-01',
    poster_path: null,
    popularity: 10,
    vote_average: 7,
    genre_ids: [],
    credit_id: `k${id}${job}`,
    job,
    department: 'Crew',
    ...over,
  }
}

function work(id: number, over: Partial<PersonWork> = {}): PersonWork {
  return {
    key: `movie_${id}`,
    mediaType: 'movie',
    id,
    title: `Movie ${id}`,
    posterPath: null,
    date: '2000-01-01',
    rating: 7,
    popularity: 10,
    roles: ['actor'],
    credits: ['Hero'],
    episodeCount: null,
    ...over,
  }
}

describe('crewRole', () => {
  it('maps jobs to the three filters and leaves the rest as other', () => {
    expect(crewRole('Director')).toBe('director')
    expect(crewRole('Screenplay')).toBe('writer')
    expect(crewRole('Producer')).toBe('other')
  })
})

describe('buildFilmography', () => {
  it('merges the several jobs of one title into a single work', () => {
    const works = buildFilmography(
      [],
      [crewCredit(1, 'Director'), crewCredit(1, 'Screenplay'), crewCredit(1, 'Producer')],
    )
    expect(works).toHaveLength(1)
    expect(works[0]?.roles).toEqual(['director', 'writer', 'other'])
    expect(works[0]?.credits).toEqual(['Director', 'Screenplay', 'Producer'])
  })

  it('merges a cast and a crew entry of the same title', () => {
    const works = buildFilmography([movieCast(1)], [crewCredit(1, 'Director')])
    expect(works).toHaveLength(1)
    expect(works[0]?.roles).toEqual(['actor', 'director'])
  })

  it('does not mix a movie and a series with the same id', () => {
    const series: PersonCastCredit = {
      ...movieCast(1),
      media_type: 'tv',
      title: undefined,
      name: 'Show 1',
      release_date: undefined,
      first_air_date: '2010-05-05',
    }
    const works = buildFilmography([movieCast(1), series], [])
    expect(works.map((w) => w.key)).toEqual(['movie_1', 'tv_1'])
    expect(works[1]?.title).toBe('Show 1')
    expect(works[1]?.date).toBe('2010-05-05')
  })

  it('collapses repeated series entries: same character once, larger episode count', () => {
    const entry = (
      credit_id: string,
      episode_count: number,
      character = 'Walter',
    ): PersonCastCredit => ({
      ...movieCast(7),
      media_type: 'tv',
      title: undefined,
      name: 'Show 7',
      first_air_date: '2008-01-20',
      credit_id,
      character,
      episode_count,
      popularity: credit_id === 'b' ? 50 : 20,
    })
    const [only, ...rest] = buildFilmography(
      [entry('a', 12), entry('b', 62), entry('c', 5, 'Heisenberg')],
      [],
    )
    expect(rest).toEqual([])
    expect(only?.credits).toEqual(['Walter', 'Heisenberg'])
    expect(only?.episodeCount).toBe(62)
    expect(only?.popularity).toBe(50)
  })

  it('drops entries without a title and unknown media types', () => {
    const odd = { ...movieCast(3), media_type: 'person' } as unknown as PersonCastCredit
    expect(buildFilmography([movieCast(2, { title: '' }), odd], [])).toEqual([])
  })

  it('keeps a poster from a later entry when the first has none', () => {
    const works = buildFilmography(
      [movieCast(1, { poster_path: null })],
      [crewCredit(1, 'Director', { poster_path: '/p.jpg' })],
    )
    expect(works[0]?.posterPath).toBe('/p.jpg')
  })
})

describe('splitReleased', () => {
  it('puts undated and future works into upcoming; today counts as released', () => {
    const works = [
      work(1, { date: '2020-01-01' }),
      work(2, { date: '' }),
      work(3, { date: '2027-03-01' }),
      work(4, { date: TODAY }),
    ]
    const { released, upcoming } = splitReleased(works, TODAY)
    expect(released.map((w) => w.id)).toEqual([1, 4])
    expect(upcoming.map((w) => w.id)).toEqual([2, 3])
  })

  it('formats the local day with zero padding', () => {
    expect(isoDay(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('filterWorks', () => {
  const works = [
    work(1, { roles: ['actor'] }),
    work(2, { roles: ['director', 'writer'] }),
    work(3, { roles: ['actor'], mediaType: 'tv', key: 'tv_3' }),
    work(4, { roles: ['other'] }),
  ]

  it('filters by role and by type, and combines them', () => {
    expect(filterWorks(works, { role: 'all', media: 'all' })).toHaveLength(4)
    expect(filterWorks(works, { role: 'writer', media: 'all' }).map((w) => w.id)).toEqual([2])
    expect(filterWorks(works, { role: 'actor', media: 'tv' }).map((w) => w.id)).toEqual([3])
    expect(filterWorks(works, { role: 'director', media: 'tv' })).toEqual([])
  })
})

describe('sortWorks', () => {
  const works = [
    work(1, { date: '2010-01-01', popularity: 5 }),
    work(2, { date: '2020-01-01', popularity: 1 }),
    work(3, { date: '2020-01-01', popularity: 9 }),
  ]

  it('sorts by date, newest first, then popularity', () => {
    expect(sortWorks(works, 'year').map((w) => w.id)).toEqual([3, 2, 1])
  })

  it('sorts by popularity, then date', () => {
    expect(sortWorks(works, 'popularity').map((w) => w.id)).toEqual([3, 1, 2])
  })

  it('does not change the input', () => {
    const copy = [...works]
    sortWorks(works, 'year')
    expect(works).toEqual(copy)
  })

  it('puts the nearest announced work first and undated ones last', () => {
    const upcoming = [
      work(1, { date: '' }),
      work(2, { date: '2028-01-01' }),
      work(3, { date: '2027-01-01' }),
    ]
    expect(sortUpcoming(upcoming).map((w) => w.id)).toEqual([3, 2, 1])
  })
})

describe('knownFor', () => {
  const actorWorks = Array.from({ length: 8 }, (_, i) => work(i + 1, { popularity: i + 1 }))

  it('takes the six most popular released works', () => {
    expect(knownFor(actorWorks, 'Acting', TODAY).map((w) => w.id)).toEqual([8, 7, 6, 5, 4, 3])
  })

  it('skips unreleased works and appearances as oneself', () => {
    const works = [
      ...actorWorks.slice(0, 4),
      work(20, { popularity: 999, date: '2030-01-01' }),
      work(21, { popularity: 998, credits: ['Himself'] }),
    ]
    expect(knownFor(works, 'Acting', TODAY).map((w) => w.id)).toEqual([4, 3, 2, 1])
  })

  it('follows the main craft: a director is known for directed works', () => {
    const works = [
      ...actorWorks.map((w) => ({ ...w, popularity: w.popularity + 100 })),
      ...[31, 32, 33, 34].map((id) => work(id, { roles: ['director'], popularity: id - 30 })),
    ]
    expect(knownFor(works, 'Directing', TODAY).map((w) => w.id)).toEqual([34, 33, 32, 31])
  })

  it('returns nothing when there are fewer than four works', () => {
    expect(knownFor(actorWorks.slice(0, 3), 'Acting', TODAY)).toEqual([])
  })
})

describe('seenProgress', () => {
  it('counts completed works as seen and plan works as planned; watching is not seen', () => {
    const statuses = new Map<MediaKey, LibraryStatus>([
      ['movie_1', 'completed'],
      ['movie_2', 'plan'],
      ['movie_3', 'watching'],
      ['movie_9', 'completed'],
    ])
    const released = [work(1), work(2), work(3), work(4)]
    expect(seenProgress(released, statuses)).toEqual({ seen: 1, planned: 1, total: 4 })
  })

  it('is empty-safe', () => {
    expect(seenProgress([], new Map())).toEqual({ seen: 0, planned: 0, total: 0 })
  })
})

describe('biographyOf', () => {
  const english = {
    translations: [{ iso_639_1: 'en', iso_3166_1: 'US', data: { biography: ' English bio ' } }],
  }

  it('prefers the biography in the current language', () => {
    expect(biographyOf({ biography: 'Өмірбаян', translations: english })).toBe('Өмірбаян')
  })

  it('falls back to English, and to nothing', () => {
    expect(biographyOf({ biography: '  ', translations: english })).toBe('English bio')
    expect(biographyOf({ biography: '' })).toBe('')
  })
})

describe('keyCrew', () => {
  const member = (id: number, job: string) => ({ id, name: `Person ${id}`, job })

  it('lists a person once with their jobs merged, writer jobs counted as one', () => {
    const crew = keyCrew([
      member(1, 'Director'),
      member(1, 'Screenplay'),
      member(1, 'Story'),
      member(1, 'Producer'),
    ])
    expect(crew).toEqual([{ id: 1, name: 'Person 1', jobs: ['director', 'writer', 'producer'] }])
  })

  it('ignores jobs that are not key ones', () => {
    expect(keyCrew([member(1, 'Gaffer'), member(2, 'Catering')])).toEqual([])
  })

  it('orders people by their most important job and respects the limit', () => {
    const crew = keyCrew(
      [member(1, 'Producer'), member(2, 'Original Music Composer'), member(3, 'Director')],
      2,
    )
    expect(crew.map((p) => p.id)).toEqual([3, 2])
  })

  it('puts series creators first', () => {
    const crew = keyCrew([member(1, 'Director'), member(2, 'Creator')])
    expect(crew.map((p) => p.id)).toEqual([2, 1])
  })
})
