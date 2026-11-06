// Sharing is the same for lists and plans: both documents carry these fields (DATA_MODEL).

/** `link` = anyone with the URL can read (never write). */
export type Visibility = 'private' | 'link'

/** Roles stored on a shared document for members (the owner isn't stored there). */
export type MemberRole = 'editor' | 'viewer'

/** What the current user is on a shared page: decides which actions are shown. */
export type ShareRole = 'owner' | MemberRole | 'link'

/** Firestore collections that can be shared. */
export type SharedCollection = 'lists' | 'plans'

/** The sharing part of a list or plan document. */
export interface Shareable {
  id: string
  ownerUid: string
  ownerName: string
  visibility: Visibility
  /** email (lowercase) → role. */
  roles: Record<string, MemberRole>
  /** Keys of `roles`, for `array-contains` queries ("Shared with me"). */
  memberEmails: string[]
}

export interface Member {
  email: string
  role: MemberRole
}
