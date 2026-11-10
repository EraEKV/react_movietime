import { describe, expect, it } from 'vitest'
import type { AggregateCastMember, AggregateCrewMember, SeriesDetails } from '../types/tmdb'
import { castFromAggregate, crewFromAggregate, seriesCredits } from './credits'

const cast = (over: Partial<AggregateCastMember> = {}): AggregateCastMember => ({
  id: 1,
  name: 'Kevin Alejandro',
  profile_path: '/k.jpg',
  roles: [{ credit_id: 'a', character: 'Jayce (voice)', episode_count: 17 }],
  total_episode_count: 17,
  order: 2,
  ...over,
})

const crew = (): AggregateCrewMember => ({
  id: 7,
  name: 'Arnaud-Loris Baudry',
  department: 'Art',
  jobs: [
    { credit_id: 'p', job: 'Production Design', episode_count: 15 },
    { credit_id: 'c', job: 'Concept Artist', episode_count: 2 },
  ],
  total_episode_count: 17,
})

describe('castFromAggregate', () => {
  it('keeps one entry per person and orders the roles by episodes', () => {
    const [person] = castFromAggregate([
      cast({
        roles: [
          { credit_id: 'b', character: 'Warwick', episode_count: 2 },
          { credit_id: 'a', character: 'Vander', episode_count: 13 },
          { credit_id: 'c', character: 'Crowd', episode_count: 1 },
        ],
      }),
    ])
    expect(person).toEqual({
      id: 1,
      credit_id: 'a',
      name: 'Kevin Alejandro',
      profile_path: '/k.jpg',
      character: 'Vander / Warwick',
    })
  })

  it('copes with a person without roles', () => {
    expect(castFromAggregate([cast({ roles: [] })])[0]).toMatchObject({
      credit_id: 'person-1',
      character: '',
    })
  })
})

describe('crewFromAggregate', () => {
  it('turns each job into a line with the person id', () => {
    expect(crewFromAggregate([crew()]).map((line) => [line.id, line.job])).toEqual([
      [7, 'Production Design'],
      [7, 'Concept Artist'],
    ])
  })
})

describe('seriesCredits', () => {
  const plain = {
    cast: [{ id: 9, credit_id: 'x', name: 'Plain', profile_path: null, character: '' }],
    crew: [{ id: 9, credit_id: 'y', name: 'Plain', job: 'Director', department: 'Directing' }],
  }

  it('prefers the aggregate credits', () => {
    const credits = seriesCredits({
      credits: plain,
      aggregate_credits: { cast: [cast()], crew: [crew()] },
    } as Pick<SeriesDetails, 'credits' | 'aggregate_credits'>)
    expect(credits.cast.map((c) => c.name)).toEqual(['Kevin Alejandro'])
    expect(credits.crew).toHaveLength(2)
  })

  it('falls back to the plain credits when the aggregate is missing or empty', () => {
    expect(seriesCredits({ credits: plain }).cast).toEqual(plain.cast)
    expect(
      seriesCredits({ credits: plain, aggregate_credits: { cast: [], crew: [] } }).crew,
    ).toEqual(plain.crew)
  })
})
