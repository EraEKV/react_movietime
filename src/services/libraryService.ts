import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
  type DocumentData,
  type FieldValue,
  type Unsubscribe,
} from 'firebase/firestore'
import type { LibraryChanges, LibraryEntry, SeriesProgress } from '../types/library'
import { isLibraryStatus, type OrderUpdate } from '../utils/library'
import { parseMediaKey } from '../utils/media'
import { logActivity } from './activityService'
import { db } from './firestore'

// users/{uid}/library/{mediaKey}: one document per title, the key is the document id,
// so adding the same title twice just overwrites it instead of creating a duplicate.
const libraryCol = (uid: string) => collection(db, 'users', uid, 'library')
const entryRef = (uid: string, key: string) => doc(db, 'users', uid, 'library', key)

/** Firestore keeps at most 500 writes in one batch; stay well below it. */
const BATCH_LIMIT = 400

const toIso = (value: unknown): string | null =>
  value instanceof Timestamp ? value.toDate().toISOString() : null

const fromIso = (value: string | null): Timestamp | null =>
  value ? Timestamp.fromDate(new Date(value)) : null

function toProgress(value: unknown): SeriesProgress | null {
  if (typeof value !== 'object' || value === null) return null
  const { season, episode, watchedEpisodes } = value as Record<string, unknown>
  return typeof season === 'number' &&
    typeof episode === 'number' &&
    typeof watchedEpisodes === 'number'
    ? { season, episode, watchedEpisodes }
    : null
}

/** Firestore document → app entry. Timestamps become ISO strings (serializable for Redux). */
function toEntry(id: string, data: DocumentData): LibraryEntry | null {
  const parsed = parseMediaKey(id)
  if (!parsed || !isLibraryStatus(data.status)) return null
  const now = new Date().toISOString()
  return {
    key: `${parsed.mediaType}_${parsed.id}`,
    mediaType: parsed.mediaType,
    tmdbId: parsed.id,
    title: String(data.title ?? ''),
    posterPath: typeof data.posterPath === 'string' ? data.posterPath : null,
    year: typeof data.year === 'string' ? data.year : null,
    genreIds: Array.isArray(data.genreIds) ? data.genreIds.filter(Number.isInteger) : [],
    tmdbRating: typeof data.tmdbRating === 'number' ? data.tmdbRating : null,
    runtime: typeof data.runtime === 'number' ? data.runtime : null,
    totalEpisodes: typeof data.totalEpisodes === 'number' ? data.totalEpisodes : null,
    status: data.status,
    score: typeof data.score === 'number' ? data.score : null,
    notes: typeof data.notes === 'string' ? data.notes : '',
    progress: toProgress(data.progress),
    // A write made a moment ago has no server time yet; 'estimate' (below) fills these in.
    addedAt: toIso(data.addedAt) ?? now,
    updatedAt: toIso(data.updatedAt) ?? now,
    completedAt: toIso(data.completedAt),
    order: typeof data.order === 'number' ? data.order : null,
  }
}

type Stamp = Timestamp | FieldValue | null

/** App entry → document fields. `key` isn't stored: it is the document id. */
function toDocument(
  entry: LibraryEntry,
  dates: { addedAt: Stamp; updatedAt: Stamp; completedAt: Stamp },
) {
  return {
    mediaType: entry.mediaType,
    tmdbId: entry.tmdbId,
    title: entry.title,
    posterPath: entry.posterPath,
    year: entry.year,
    genreIds: entry.genreIds,
    tmdbRating: entry.tmdbRating,
    runtime: entry.runtime,
    totalEpisodes: entry.totalEpisodes,
    status: entry.status,
    score: entry.score,
    notes: entry.notes,
    progress: entry.progress,
    // Only written once the title has been moved, so ordinary saves keep working with
    // rules that predate the field.
    ...(entry.order !== null && { order: entry.order }),
    ...dates,
  }
}

/**
 * Subscribes to the whole library and returns the unsubscribe function.
 * Thanks to the persistent cache the first snapshot comes from IndexedDB right away
 * (also offline), and local writes show up immediately, before the server confirms them.
 */
export function watchLibrary(
  uid: string,
  onData: (entries: LibraryEntry[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    libraryCol(uid),
    (snapshot) => {
      const entries = snapshot.docs
        .map((d) => toEntry(d.id, d.data({ serverTimestamps: 'estimate' })))
        .filter((entry): entry is LibraryEntry => entry !== null)
      onData(entries)
    },
    onError,
  )
}

/** A new entry: the server sets the dates. Also goes to the activity feed. */
export function addEntry(uid: string, entry: LibraryEntry): Promise<void> {
  const now = serverTimestamp()
  const saved = setDoc(
    entryRef(uid, entry.key),
    toDocument(entry, {
      addedAt: now,
      updatedAt: now,
      completedAt: entry.status === 'completed' ? now : null,
    }),
  )
  // Not awaited and not part of the write above: a failed log must not fail the add.
  logActivity(uid, {
    type: 'library.add',
    title: entry.title,
    mediaKey: entry.key,
    meta: { status: entry.status },
  })
  return saved
}

/** Puts a removed entry back exactly as it was ("Undo"), keeping its original dates. */
export function restoreEntry(uid: string, entry: LibraryEntry): Promise<void> {
  return setDoc(
    entryRef(uid, entry.key),
    toDocument(entry, {
      addedAt: fromIso(entry.addedAt),
      updatedAt: serverTimestamp(),
      completedAt: fromIso(entry.completedAt),
    }),
  )
}

/**
 * Changes some fields of `entry` (the entry as it was before). `completed` says what happens
 * to completedAt: 'set' (became completed now), 'clear' (left completed) or 'keep'.
 * A new status goes to the activity feed; score, notes and progress don't.
 */
export function updateEntry(
  uid: string,
  entry: Pick<LibraryEntry, 'key' | 'title' | 'status'>,
  changes: LibraryChanges,
  completed: 'set' | 'clear' | 'keep',
): Promise<void> {
  const saved = updateDoc(entryRef(uid, entry.key), {
    ...changes,
    updatedAt: serverTimestamp(),
    ...(completed === 'set' && { completedAt: serverTimestamp() }),
    ...(completed === 'clear' && { completedAt: null }),
  })
  if (changes.status && changes.status !== entry.status) {
    logActivity(uid, {
      type: 'library.status',
      title: entry.title,
      mediaKey: entry.key,
      meta: { status: changes.status },
    })
  }
  return saved
}

/**
 * Saves new places in the manual order in one atomic batch. Only `order` is written:
 * updatedAt stays, so "Recently updated" isn't shuffled by a drag.
 */
export async function setOrders(uid: string, updates: OrderUpdate[]): Promise<void> {
  for (let i = 0; i < updates.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db)
    for (const { key, order } of updates.slice(i, i + BATCH_LIMIT)) {
      batch.update(entryRef(uid, key), { order })
    }
    await batch.commit()
  }
}

export function removeEntry(uid: string, key: string): Promise<void> {
  return deleteDoc(entryRef(uid, key))
}

/**
 * Moves a guest library into the account after sign-in. Titles that are already in the
 * account win (they may have a score or notes from another device). Batched writes are
 * atomic: a chunk is saved completely or not at all.
 */
export async function mergeGuestLibrary(
  uid: string,
  entries: LibraryEntry[],
): Promise<{ added: number; skipped: number }> {
  const existing = await getDocs(libraryCol(uid))
  const known = new Set(existing.docs.map((d) => d.id))
  const fresh = entries.filter((entry) => !known.has(entry.key))

  for (let i = 0; i < fresh.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db)
    for (const entry of fresh.slice(i, i + BATCH_LIMIT)) {
      batch.set(
        entryRef(uid, entry.key),
        toDocument(entry, {
          addedAt: fromIso(entry.addedAt),
          updatedAt: serverTimestamp(),
          completedAt: fromIso(entry.completedAt),
        }),
      )
    }
    await batch.commit()
  }

  return { added: fresh.length, skipped: entries.length - fresh.length }
}
