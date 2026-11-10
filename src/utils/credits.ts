import type {
  AggregateCastMember,
  AggregateCrewMember,
  CastMember,
  CrewMember,
  SeriesDetails,
} from '../types/tmdb'

/** The role the person played in the most episodes comes first. */
const byEpisodes = (a: { episode_count: number }, b: { episode_count: number }) =>
  b.episode_count - a.episode_count

/**
 * Aggregate cast as the plain cast list the page already renders: one entry per person,
 * the role with the most episodes as the character (the next one is added: "Vander / Warwick").
 */
export function castFromAggregate(list: AggregateCastMember[]): CastMember[] {
  return list.map((person) => {
    const roles = [...person.roles].sort(byEpisodes)
    const characters = [...new Set(roles.map((role) => role.character.trim()).filter(Boolean))]
    return {
      id: person.id,
      credit_id: roles[0]?.credit_id ?? `person-${person.id}`,
      name: person.name,
      profile_path: person.profile_path,
      character: characters.slice(0, 2).join(' / '),
    }
  })
}

/** Aggregate crew as one line per job, like the plain crew list (the same person repeats). */
export function crewFromAggregate(list: AggregateCrewMember[]): CrewMember[] {
  return list.flatMap((person) =>
    person.jobs.map((job) => ({
      id: person.id,
      credit_id: job.credit_id,
      name: person.name,
      job: job.job,
      department: person.department,
    })),
  )
}

/**
 * Cast and crew of a series. TMDB's show-level `credits` often holds a couple of people
 * (Arcane: two of ninety), the aggregate over all seasons holds everyone — so it wins when it
 * has anything, and the plain list is the fallback.
 */
export function seriesCredits(series: Pick<SeriesDetails, 'credits' | 'aggregate_credits'>): {
  cast: CastMember[]
  crew: CrewMember[]
} {
  const aggregate = series.aggregate_credits
  return {
    cast: aggregate?.cast.length ? castFromAggregate(aggregate.cast) : series.credits.cast,
    crew: aggregate?.crew.length ? crewFromAggregate(aggregate.crew) : series.credits.crew,
  }
}
