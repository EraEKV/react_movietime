import type { WatchlistEntry } from '../types/watchlist'

export const WATCHLIST_KEY = 'movietime.watchlist.v1'

const isEntry = (value: unknown): value is WatchlistEntry =>
  typeof value === 'object' &&
  value !== null &&
  'id' in value &&
  'seriesId' in value &&
  Boolean(value.id) &&
  Boolean(value.seriesId)

/** Reads the watchlist; corrupted or missing data falls back to an empty list. */
export function loadWatchlist(): WatchlistEntry[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(WATCHLIST_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter(isEntry) : []
  } catch {
    return []
  }
}

export function saveWatchlist(entries: WatchlistEntry[]): void {
  try {
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(entries))
  } catch {
    // Storage full or disabled (private mode) — the list still works for this session.
  }
}
