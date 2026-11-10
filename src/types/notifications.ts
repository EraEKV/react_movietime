import type { MemberRole, SharedCollection } from './sharing'

interface NotificationBase {
  id: string
  collection: SharedCollection
  targetId: string
  /** The list or plan name when the notification was written. */
  targetTitle: string
  fromName: string
  /** ISO string. */
  createdAt: string
  read: boolean
}

/** "You were given access" (`notifications/{id}`, docs/DATA_MODEL.md), addressed by email. */
export interface SharedNotification extends NotificationBase {
  type: 'shared'
  role: MemberRole
}

/**
 * Something about a film suggestion in a movie marathon, addressed by uid: a member's
 * suggestion for the owner (`proposal`), or the owner's answer for its author (`answer`).
 */
export interface SuggestionNotification extends NotificationBase {
  type: 'proposal' | 'answer'
  collection: 'plans'
  /** The suggested film. */
  film: string
  /** Only on an answer. */
  decision: 'accepted' | 'rejected' | null
}

/** One in-app notification as the app reads it. */
export type AppNotification = SharedNotification | SuggestionNotification
