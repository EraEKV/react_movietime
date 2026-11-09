import type { LibraryEntry } from '../types/library'
import { isLibraryStatus } from '../utils/library'
import { mediaKey, parseMediaKey } from '../utils/media'

export const LIBRARY_KEY = 'movietime.library.v1'
/** The midterm watchlist (series only). Moved into the library once, then deleted. */
const LEGACY_WATCHLIST_KEY = 'movietime.watchlist.v1'

type UnknownRecord = Record<string, unknown>

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null

// localStorage can hold anything (old versions, manual edits), so every entry is checked
// before the app trusts it. Broken entries are dropped instead of crashing the page.
function isEntry(value: unknown): value is LibraryEntry {
  return (
    isRecord(value) &&
    typeof value.key === 'string' &&
    parseMediaKey(value.key) !== null &&
    typeof value.title === 'string' &&
    isLibraryStatus(value.status) &&
    typeof value.addedAt === 'string'
  )
}

function readJson(key: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null')
  } catch {
    return null
  }
}

export function loadGuestLibrary(): LibraryEntry[] {
  const parsed = readJson(LIBRARY_KEY)
  if (!Array.isArray(parsed)) return []
  // Entries saved before manual ordering existed have no `order` field.
  return parsed
    .filter(isEntry)
    .map((entry) => ({ ...entry, order: typeof entry.order === 'number' ? entry.order : null }))
}

export function saveGuestLibrary(entries: LibraryEntry[]): void {
  try {
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(entries))
  } catch {
    // Storage full or disabled (private mode): the library still works for this session.
  }
}

export function clearGuestLibrary(): void {
  try {
    localStorage.removeItem(LIBRARY_KEY)
  } catch {
    // Nothing to clean up if storage is unavailable.
  }
}

/** A midterm watchlist entry → a library entry. Fields the midterm didn't have get defaults. */
function fromLegacy(value: unknown): LibraryEntry | null {
  if (!isRecord(value) || typeof value.seriesId !== 'number' || typeof value.name !== 'string') {
    return null
  }
  const now = new Date().toISOString()
  const status = isLibraryStatus(value.status) ? value.status : 'plan'
  const date = typeof value.firstAirDate === 'string' ? value.firstAirDate : null
  const addedAt = typeof value.addedAt === 'string' ? value.addedAt : now
  return {
    key: mediaKey('tv', value.seriesId),
    mediaType: 'tv',
    tmdbId: value.seriesId,
    title: value.name,
    posterPath: typeof value.posterPath === 'string' ? value.posterPath : null,
    year: date ? date.slice(0, 4) : null,
    genreIds: [],
    tmdbRating: typeof value.tmdbRating === 'number' ? value.tmdbRating : null,
    runtime: null,
    totalEpisodes: null,
    status,
    score: typeof value.score === 'number' ? value.score : null,
    notes: typeof value.notes === 'string' ? value.notes : '',
    progress: null,
    addedAt,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : addedAt,
    completedAt: status === 'completed' ? addedAt : null,
    order: null,
  }
}

/**
 * One-time move of the midterm watchlist into the guest library. Titles already in the
 * library win. Returns how many entries were moved.
 */
export function migrateLegacyWatchlist(): number {
  const legacy = readJson(LEGACY_WATCHLIST_KEY)
  if (!Array.isArray(legacy)) return 0

  const library = loadGuestLibrary()
  const known = new Set(library.map((entry) => entry.key))
  const moved = legacy.map(fromLegacy).filter((entry): entry is LibraryEntry => {
    // Skips titles already in the library and repeats inside the old list itself.
    if (entry === null || known.has(entry.key)) return false
    known.add(entry.key)
    return true
  })

  saveGuestLibrary([...moved, ...library])
  try {
    localStorage.removeItem(LEGACY_WATCHLIST_KEY)
  } catch {
    // Will be tried again on the next start; entries already moved are skipped then.
  }
  return moved.length
}
