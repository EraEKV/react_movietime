// Shapes of the TMDB responses the app reads. Only the fields we use are listed;
// TMDB sends more. Paths and dates can be null or "" for incomplete records.

export interface Genre {
  id: number
  name: string
}

export interface GenresResponse {
  genres: Genre[]
}

export interface Paginated<T> {
  page: number
  results: T[]
  total_pages: number
  total_results: number
}

/** A series as returned by /discover/tv, /search/tv and recommendations. */
export interface SeriesListItem {
  id: number
  name: string
  poster_path: string | null
  first_air_date: string
  vote_average: number
  genre_ids: number[]
}

/** A movie as returned by /trending/movie, /discover/movie and /search/movie. */
export interface MovieListItem {
  id: number
  title: string
  poster_path: string | null
  release_date: string
  vote_average: number
  genre_ids: number[]
}

export interface SeasonSummary {
  id: number
  name: string
  season_number: number
  episode_count: number
  air_date: string | null
  poster_path: string | null
  vote_average: number
}

export interface CastMember {
  /** The person's TMDB id: links to /person/:id. */
  id: number
  credit_id: string
  name: string
  profile_path: string | null
  character: string
}

export interface CrewMember {
  id: number
  credit_id: string
  name: string
  job: string
  department: string
}

export interface Video {
  key: string
  name: string
  site: string
  type: string
  official: boolean
}

/** One streaming service as TMDB returns it (/watch/providers; the data comes from JustWatch). */
export interface WatchProvider {
  provider_id: number
  provider_name: string
  logo_path: string | null
  display_priority: number
}

/** What is offered in one country. `link` is the TMDB page for that country (it leads to JustWatch). */
export interface WatchRegion {
  link: string
  flatrate?: WatchProvider[]
  free?: WatchProvider[]
  ads?: WatchProvider[]
  rent?: WatchProvider[]
  buy?: WatchProvider[]
}

/** Appended with `watch/providers`: every country at once, keyed by ISO 3166-1 code. */
export interface WatchProviders {
  results: Record<string, WatchRegion>
}

export interface NamedEntity {
  id: number
  name: string
}

/** /tv/{id} without append_to_response. */
export interface SeriesSummary {
  id: number
  name: string
  poster_path: string | null
  first_air_date: string
  vote_average: number
}

/** /tv/{id}: the series with its seasons, without appended responses. */
export interface SeriesBase extends SeriesSummary {
  original_name: string
  tagline: string
  overview: string
  backdrop_path: string | null
  last_air_date: string | null
  in_production: boolean
  number_of_seasons: number
  number_of_episodes: number
  /** Typical episode lengths in minutes; often empty for newer shows. */
  episode_run_time: number[]
  status: string
  vote_count: number
  genres: Genre[]
  created_by: NamedEntity[]
  networks: NamedEntity[]
  seasons: SeasonSummary[]
}

/** One language version of a title (append_to_response=translations). */
export interface Translation {
  iso_639_1: string
  iso_3166_1: string
  data: { overview?: string; biography?: string }
}

export interface Translations {
  translations: Translation[]
}

/**
 * A person in /tv/{id}/aggregate_credits: one entry per person over all seasons and episodes,
 * with every role. (Plain `credits` of a series only lists what is entered at show level:
 * often two people for a cast of ninety.)
 */
export interface AggregateCastMember {
  id: number
  name: string
  profile_path: string | null
  roles: { credit_id: string; character: string; episode_count: number }[]
  total_episode_count: number
  order: number
}

export interface AggregateCrewMember {
  id: number
  name: string
  department: string
  jobs: { credit_id: string; job: string; episode_count: number }[]
  total_episode_count: number
}

/** /tv/{id}?append_to_response=credits,aggregate_credits,videos,recommendations,translations */
export interface SeriesDetails extends SeriesBase {
  credits: { cast: CastMember[]; crew: CrewMember[] }
  aggregate_credits?: { cast: AggregateCastMember[]; crew: AggregateCrewMember[] }
  videos: { results: Video[] }
  recommendations: Paginated<SeriesListItem>
  translations?: Translations
  'watch/providers'?: WatchProviders
}

/** /movie/{id} without appended responses. */
export interface MovieBase {
  id: number
  title: string
  original_title: string
  tagline: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  release_date: string
  /** Minutes; 0 when unknown. */
  runtime: number | null
  status: string
  /** US dollars; 0 when TMDB doesn't know. */
  budget: number
  revenue: number
  vote_average: number
  vote_count: number
  original_language: string
  genres: Genre[]
  production_countries: { iso_3166_1: string; name: string }[]
}

/** /movie/{id}?append_to_response=credits,videos,recommendations,translations */
export interface MovieDetails extends MovieBase {
  credits: { cast: CastMember[]; crew: CrewMember[] }
  videos: { results: Video[] }
  recommendations: Paginated<MovieListItem>
  translations?: Translations
  'watch/providers'?: WatchProviders
}

export interface RawEpisode {
  id: number
  season_number: number
  episode_number: number
  name: string
  overview: string
  air_date: string | null
  runtime: number | null
  still_path: string | null
  vote_count: number
  vote_average: number
}

export interface RawSeason {
  season_number: number
  name: string
  episodes: RawEpisode[]
}

/** /tv/{id}?append_to_response=season/1,season/2,… puts each season under its own key. */
export type SeasonsBatchResponse = Partial<Record<`season/${number}`, RawSeason>>

/** One line of /person/{id}/combined_credits: a movie or a series the person worked on. */
export interface PersonCredit {
  id: number
  media_type: 'movie' | 'tv'
  /** Movies have `title` and `release_date`, series `name` and `first_air_date`. */
  title?: string
  name?: string
  release_date?: string
  first_air_date?: string
  poster_path: string | null
  popularity: number
  vote_average: number
  genre_ids: number[]
  credit_id: string
}

export interface PersonCastCredit extends PersonCredit {
  /** Empty for talk shows and the like. */
  character?: string
  /** Series only: how many episodes the person appears in. */
  episode_count?: number
}

export interface PersonCrewCredit extends PersonCredit {
  /** "Director", "Screenplay", "Producer"… */
  job: string
  department: string
}

/** /person/{id}?append_to_response=combined_credits,translations */
export interface PersonDetails {
  id: number
  name: string
  biography: string
  birthday: string | null
  deathday: string | null
  place_of_birth: string | null
  profile_path: string | null
  known_for_department: string
  combined_credits: { cast: PersonCastCredit[]; crew: PersonCrewCredit[] }
  translations?: Translations
}
