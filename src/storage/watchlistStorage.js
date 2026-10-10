export const WATCHLIST_KEY = 'movietime.watchlist.v1'

/** Reads the watchlist; corrupted or missing data falls back to an empty list. */
export function loadWatchlist() {
  try {
    const parsed = JSON.parse(localStorage.getItem(WATCHLIST_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((e) => e && e.id && e.seriesId) : []
  } catch {
    return []
  }
}

export function saveWatchlist(entries) {
  try {
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(entries))
  } catch {
    // Storage full or disabled (private mode) — the list still works for this session.
  }
}
