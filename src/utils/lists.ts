// Pure helpers for lists: limits, validation, snapshots and the cover collage.
import type { LibraryMedia } from '../types/library'
import type { ListDraft, ListItem, ListMedia, ListRole } from '../types/list'
import type { MediaSummary } from '../types/media'
import { getYear, pluralize } from './format'

export const LIST_NAME_MAX = 60
export const LIST_DESCRIPTION_MAX = 300
export const LIST_NOTE_MAX = 200
export const LIST_COVERS = 4

export const LIST_EMOJIS = [
  '🍿',
  '🎬',
  '🌙',
  '🎃',
  '🚀',
  '📼',
  '🔥',
  '🌧️',
  '❤️',
  '😂',
  '👻',
  '🏔️',
  '🎄',
  '☕',
  '🧠',
  '🌊',
] as const

export const EMPTY_DRAFT: ListDraft = { name: '', description: '', emoji: LIST_EMOJIS[0] }

/** Same checks as firestore.rules, so the form never sends something the server rejects. */
export function validateListDraft(draft: Record<keyof ListDraft, string>) {
  const name = draft.name.trim()
  return {
    name: !name
      ? 'Give your list a name.'
      : name.length > LIST_NAME_MAX
        ? `Keep the name under ${LIST_NAME_MAX} characters.`
        : null,
    description:
      draft.description.trim().length > LIST_DESCRIPTION_MAX
        ? `Keep the description under ${LIST_DESCRIPTION_MAX} characters.`
        : null,
    emoji: null,
  }
}

export const cleanDraft = (draft: ListDraft): ListDraft => ({
  name: draft.name.trim(),
  description: draft.description.trim(),
  emoji: draft.emoji,
})

/** List item snapshot from a catalog or search card. */
export function summaryToListMedia(item: MediaSummary): ListMedia {
  return {
    mediaType: item.mediaType,
    tmdbId: item.id,
    title: item.title,
    posterPath: item.posterPath,
    year: getYear(item.date),
    genreIds: item.genreIds,
    tmdbRating: item.rating || null,
  }
}

/** List item snapshot from a title page (which builds a library snapshot already). */
export function libraryToListMedia(media: LibraryMedia): ListMedia {
  return {
    mediaType: media.mediaType,
    tmdbId: media.tmdbId,
    title: media.title,
    posterPath: media.posterPath,
    year: media.year,
    genreIds: media.genreIds,
    tmdbRating: media.tmdbRating,
  }
}

/** Items in manual order (position), oldest first. Returns a new array. */
export const sortItems = (items: ListItem[]): ListItem[] =>
  items.toSorted((a, b) => a.position - b.position)

/** Collage posters: newest items with a poster first. */
export function coversOf(items: Pick<ListItem, 'posterPath' | 'position'>[]): string[] {
  return items
    .toSorted((a, b) => b.position - a.position)
    .map((item) => item.posterPath)
    .filter((path): path is string => Boolean(path))
    .slice(0, LIST_COVERS)
}

/** Covers after adding titles: their posters go in front of the current ones. */
export function coversAfterAdd(current: string[], added: ListMedia[]): string[] {
  const fresh = added.map((m) => m.posterPath).filter((p): p is string => Boolean(p))
  return [...new Set([...fresh.toReversed(), ...current])].slice(0, LIST_COVERS)
}

export const canEditItems = (role: ListRole | null) => role === 'owner' || role === 'editor'

export const titlesCount = (n: number) => pluralize(n, 'title')
