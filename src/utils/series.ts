import type { SeasonSummary } from '../types/tmdb'

/** Regular seasons first; "Specials" (season 0) last, and empty announced seasons dropped. */
export function sortSeasons(seasons: SeasonSummary[] = []): SeasonSummary[] {
  return seasons
    .filter((s) => s.episode_count > 0)
    .toSorted((a, b) => (a.season_number || Infinity) - (b.season_number || Infinity))
}
