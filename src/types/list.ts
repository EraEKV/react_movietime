import type { LibraryMedia } from './library'
import type { MediaKey } from './media'
import type { MemberRole, Shareable, ShareRole, Visibility } from './sharing'

export type { MemberRole }
export type ListVisibility = Visibility
/** What the current user is on a list page: decides which actions are shown. */
export type ListRole = ShareRole

/** Title snapshot saved with a list item, so a list renders without TMDB requests. */
export type ListMedia = Omit<LibraryMedia, 'runtime' | 'totalEpisodes'>

/**
 * `lists/{id}`. Top-level (not under users/) because lists are shared between users.
 * Dates are ISO strings in the app; the service converts Firestore Timestamps.
 */
export interface TitleList extends Shareable {
  name: string
  description: string
  emoji: string
  itemCount: number
  /** Up to 4 poster paths of the newest items, for the card collage. */
  covers: string[]
  createdAt: string
  updatedAt: string
}

/** What the list form edits. */
export interface ListDraft {
  name: string
  description: string
  emoji: string
}

/** `lists/{id}/items/{key}`: the media key is the document id, so a title is in a list once. */
export interface ListItem extends ListMedia {
  key: MediaKey
  note: string
  /** Manual order; new items get the current time, so they go last. */
  position: number
  addedBy: { uid: string; name: string }
  addedAt: string
}

/** Who writes: stored as `ownerName` / `addedBy`. */
export interface ListAuthor {
  uid: string
  name: string
}
