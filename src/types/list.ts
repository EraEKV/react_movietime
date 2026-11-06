import type { LibraryMedia } from './library'
import type { MediaKey } from './media'

export type ListVisibility = 'private' | 'link'

/** Roles stored on a list for members (the owner isn't stored there, see DATA_MODEL). */
export type MemberRole = 'editor' | 'viewer'

/** What the current user is on a list page: decides which actions are shown. */
export type ListRole = 'owner' | MemberRole | 'link'

/** Title snapshot saved with a list item, so a list renders without TMDB requests. */
export type ListMedia = Omit<LibraryMedia, 'runtime' | 'totalEpisodes'>

/**
 * `lists/{id}`. Top-level (not under users/) because lists are shared between users.
 * Dates are ISO strings in the app; the service converts Firestore Timestamps.
 */
export interface TitleList {
  id: string
  ownerUid: string
  ownerName: string
  name: string
  description: string
  emoji: string
  visibility: ListVisibility
  /** email → role. Filled by sharing (phase 7); empty for now. */
  roles: Record<string, MemberRole>
  /** Keys of `roles`, for `array-contains` queries. */
  memberEmails: string[]
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
