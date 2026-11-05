export type WatchStatus = 'plan' | 'watching' | 'completed' | 'dropped'

/** The series fields stored with an entry, so the list renders without TMDB requests. */
export interface WatchlistSeries {
  seriesId: number
  name: string
  posterPath: string | null
  firstAirDate: string | null
  tmdbRating: number | null
}

export interface WatchlistEntry extends WatchlistSeries {
  id: string
  status: WatchStatus
  /** 1–10, or null when the user hasn't rated it. */
  score: number | null
  notes: string
  /** ISO date-time strings. */
  addedAt: string
  updatedAt: string
}

export type NewWatchlistEntry = Omit<WatchlistEntry, 'id' | 'addedAt' | 'updatedAt'>

export type WatchlistChanges = Partial<Pick<WatchlistEntry, 'status' | 'score' | 'notes'>>

/** Form state: selects work with strings, so the score is a string until submit. */
export interface WatchlistFormValues {
  series: WatchlistSeries | null
  status: WatchStatus
  score: string
  notes: string
}
