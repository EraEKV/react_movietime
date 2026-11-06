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
  credit_id: string
  name: string
  profile_path: string | null
  character: string
}

export interface CrewMember {
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

/** /tv/{id}?append_to_response=credits,videos,recommendations */
export interface SeriesDetails extends SeriesSummary {
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
  credits: { cast: CastMember[] }
  videos: { results: Video[] }
  recommendations: Paginated<SeriesListItem>
}

/** /movie/{id}?append_to_response=credits,videos,recommendations */
export interface MovieDetails {
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
  credits: { cast: CastMember[]; crew: CrewMember[] }
  videos: { results: Video[] }
  recommendations: Paginated<MovieListItem>
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
