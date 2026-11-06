import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore'
import type {
  ListAuthor,
  ListDraft,
  ListItem,
  ListMedia,
  MemberRole,
  TitleList,
} from '../types/list'
import type { MediaKey } from '../types/media'
import { mediaKey, parseMediaKey } from '../utils/media'
import { logActivity } from './activityService'
import { db } from './firestore'

// lists/{listId} and lists/{listId}/items/{mediaKey} (docs/DATA_MODEL.md).
const listsCol = collection(db, 'lists')
const listRef = (id: string) => doc(db, 'lists', id)
const itemsCol = (listId: string) => collection(db, 'lists', listId, 'items')
const itemRef = (listId: string, key: string) => doc(db, 'lists', listId, 'items', key)

/** Firestore keeps at most 500 writes in one batch; stay well below it. */
const BATCH_LIMIT = 400

// Pending server timestamps are read as estimates (see the snapshot options below).
const toIso = (value: unknown): string =>
  value instanceof Timestamp ? value.toDate().toISOString() : new Date().toISOString()

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []

function toRoles(value: unknown): Record<string, MemberRole> {
  if (typeof value !== 'object' || value === null) return {}
  const roles: Record<string, MemberRole> = {}
  for (const [email, role] of Object.entries(value)) {
    if (role === 'editor' || role === 'viewer') roles[email] = role
  }
  return roles
}

/** Firestore document → app list. Unknown or missing fields fall back to safe defaults. */
function toList(id: string, data: DocumentData): TitleList {
  return {
    id,
    ownerUid: String(data.ownerUid ?? ''),
    ownerName: String(data.ownerName ?? ''),
    name: String(data.name ?? ''),
    description: String(data.description ?? ''),
    emoji: String(data.emoji ?? '🎬'),
    visibility: data.visibility === 'link' ? 'link' : 'private',
    roles: toRoles(data.roles),
    memberEmails: strings(data.memberEmails),
    itemCount: typeof data.itemCount === 'number' ? Math.max(0, data.itemCount) : 0,
    covers: strings(data.covers),
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  }
}

function toItem(id: string, data: DocumentData): ListItem | null {
  const parsed = parseMediaKey(id)
  if (!parsed) return null
  const by = (data.addedBy ?? {}) as Record<string, unknown>
  return {
    key: mediaKey(parsed.mediaType, parsed.id),
    mediaType: parsed.mediaType,
    tmdbId: parsed.id,
    title: String(data.title ?? ''),
    posterPath: typeof data.posterPath === 'string' ? data.posterPath : null,
    year: typeof data.year === 'string' ? data.year : null,
    genreIds: Array.isArray(data.genreIds) ? data.genreIds.filter(Number.isInteger) : [],
    tmdbRating: typeof data.tmdbRating === 'number' ? data.tmdbRating : null,
    note: typeof data.note === 'string' ? data.note : '',
    position: typeof data.position === 'number' ? data.position : 0,
    addedBy: { uid: String(by.uid ?? ''), name: String(by.name ?? '') },
    addedAt: toIso(data.addedAt),
  }
}

const media = (m: ListMedia): ListMedia => ({
  mediaType: m.mediaType,
  tmdbId: m.tmdbId,
  title: m.title,
  posterPath: m.posterPath,
  year: m.year,
  genreIds: m.genreIds,
  tmdbRating: m.tmdbRating,
})

const ESTIMATE = { serverTimestamps: 'estimate' } as const

/**
 * The user's own lists, recently changed first. Rules are not filters: the query asks only
 * for lists the user may read (`ownerUid == uid`), otherwise Firestore rejects all of it.
 * Needs the composite index ownerUid ASC + updatedAt DESC (firestore.indexes.json).
 */
export function watchMyLists(
  uid: string,
  onData: (lists: TitleList[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const q = query(listsCol, where('ownerUid', '==', uid), orderBy('updatedAt', 'desc'))
  return onSnapshot(
    q,
    (snapshot) => onData(snapshot.docs.map((d) => toList(d.id, d.data(ESTIMATE)))),
    onError,
  )
}

/**
 * Lists other people shared with this email, recently changed first. Again a query the
 * rules can prove: every result has the user's email in memberEmails (rules also need a
 * verified email, so the page asks only verified users).
 * Needs the composite index memberEmails ARRAY_CONTAINS + updatedAt DESC.
 */
export function watchSharedLists(
  email: string,
  onData: (lists: TitleList[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const q = query(
    listsCol,
    where('memberEmails', 'array-contains', email),
    orderBy('updatedAt', 'desc'),
  )
  return onSnapshot(
    q,
    (snapshot) => onData(snapshot.docs.map((d) => toList(d.id, d.data(ESTIMATE)))),
    onError,
  )
}

/** One list; `null` when it doesn't exist (or was just deleted). */
export function watchList(
  id: string,
  onData: (list: TitleList | null) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    listRef(id),
    (snapshot) => onData(snapshot.exists() ? toList(snapshot.id, snapshot.data(ESTIMATE)) : null),
    onError,
  )
}

export function watchListItems(
  listId: string,
  onData: (items: ListItem[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(itemsCol(listId), orderBy('position')),
    (snapshot) =>
      onData(
        snapshot.docs
          .map((d) => toItem(d.id, d.data(ESTIMATE)))
          .filter((item): item is ListItem => item !== null),
      ),
    onError,
  )
}

/**
 * Creates a list and resolves to its id once the server has accepted it.
 * doc() makes the id on the client, before anything is sent.
 */
export async function createList(owner: ListAuthor, draft: ListDraft): Promise<string> {
  const ref = doc(listsCol)
  const now = serverTimestamp()
  await setDoc(ref, {
    ownerUid: owner.uid,
    ownerName: owner.name,
    ...draft,
    visibility: 'private',
    roles: {},
    memberEmails: [],
    itemCount: 0,
    covers: [],
    createdAt: now,
    updatedAt: now,
  })
  // After the list exists; not awaited, so a failed log never fails the create (or a copy).
  logActivity(owner.uid, { type: 'list.create', title: draft.name, refId: ref.id })
  return ref.id
}

export function updateList(id: string, draft: ListDraft): Promise<void> {
  return updateDoc(listRef(id), { ...draft, updatedAt: serverTimestamp() })
}

/**
 * Deletes a list with its items. Firestore doesn't delete sub-collections with the parent,
 * so items go in batches first and the list itself in the last batch. Item rules read the
 * parent list with get(), which sees the state before the batch — so that works too.
 */
export async function deleteList(id: string): Promise<void> {
  const items = await getDocs(itemsCol(id))
  const refs = items.docs.map((d) => d.ref)
  const chunks = []
  for (let i = 0; i < refs.length; i += BATCH_LIMIT) chunks.push(refs.slice(i, i + BATCH_LIMIT))
  if (chunks.length === 0) chunks.push([]) // an empty list: one batch with just the list

  for (const [n, chunk] of chunks.entries()) {
    const batch = writeBatch(db)
    for (const ref of chunk) batch.delete(ref)
    if (n === chunks.length - 1) batch.delete(listRef(id))
    // Sequential on purpose: the list must outlive its items until the last batch.
    await batch.commit()
  }
}

/**
 * Adds titles that aren't in the list yet. Items and the list's itemCount change in one
 * batch, so the counter can't drift from the items: both are saved, or neither.
 * increment() is applied on the server, so two people adding at once don't lose a count.
 */
export function addItems(
  listId: string,
  added: ListMedia[],
  author: ListAuthor,
  covers: string[],
): Promise<void> {
  const batch = writeBatch(db)
  const start = Date.now()
  added.forEach((m, i) => {
    batch.set(itemRef(listId, mediaKey(m.mediaType, m.tmdbId)), {
      ...media(m),
      note: '',
      position: start + i,
      addedBy: { uid: author.uid, name: author.name },
      addedAt: serverTimestamp(),
    })
  })
  batch.update(listRef(listId), {
    itemCount: increment(added.length),
    covers,
    updatedAt: serverTimestamp(),
  })
  return batch.commit()
}

export function removeItem(listId: string, key: MediaKey, covers: string[]): Promise<void> {
  const batch = writeBatch(db)
  batch.delete(itemRef(listId, key))
  batch.update(listRef(listId), {
    itemCount: increment(-1),
    covers,
    updatedAt: serverTimestamp(),
  })
  return batch.commit()
}

/** "Undo" for a removed item: the same note, position and author as before. */
export function restoreItem(listId: string, item: ListItem, covers: string[]): Promise<void> {
  const batch = writeBatch(db)
  batch.set(itemRef(listId, item.key), {
    ...media(item),
    note: item.note,
    position: item.position,
    addedBy: item.addedBy,
    addedAt: Timestamp.fromDate(new Date(item.addedAt)),
  })
  batch.update(listRef(listId), {
    itemCount: increment(1),
    covers,
    updatedAt: serverTimestamp(),
  })
  return batch.commit()
}

export function updateItemNote(listId: string, key: MediaKey, note: string): Promise<void> {
  return updateDoc(itemRef(listId, key), { note })
}

/** Ids of the given lists that already contain the title (one document read per list). */
export async function listsContaining(listIds: string[], key: MediaKey): Promise<Set<string>> {
  const found = await Promise.all(
    listIds.map(async (id) => ((await getDoc(itemRef(id, key))).exists() ? id : null)),
  )
  return new Set(found.filter((id): id is string => id !== null))
}

/**
 * "Copy to my lists": a new private list owned by the current user with the same titles.
 * Two steps, because the rules check items against the list as it was *before* a batch:
 * the list must exist first, then items go in batches together with itemCount and covers.
 * Notes and order are kept; the copier becomes the author of every item.
 */
export async function copyList(source: TitleList, owner: ListAuthor): Promise<string> {
  const items = (await getDocs(query(itemsCol(source.id), orderBy('position')))).docs
    .map((d) => toItem(d.id, d.data()))
    .filter((item): item is ListItem => item !== null)

  const id = await createList(owner, {
    name: source.name,
    description: source.description,
    emoji: source.emoji,
  })

  for (let i = 0; i < items.length; i += BATCH_LIMIT) {
    const chunk = items.slice(i, i + BATCH_LIMIT)
    const batch = writeBatch(db)
    for (const item of chunk) {
      batch.set(itemRef(id, item.key), {
        ...media(item),
        note: item.note,
        position: item.position,
        addedBy: { uid: owner.uid, name: owner.name },
        addedAt: serverTimestamp(),
      })
    }
    batch.update(listRef(id), {
      itemCount: increment(chunk.length),
      covers: source.covers,
      updatedAt: serverTimestamp(),
    })
    await batch.commit()
  }
  return id
}
