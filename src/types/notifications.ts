import type { MemberRole, SharedCollection } from './sharing'

/** One in-app notification as the app reads it (`notifications/{id}`, docs/DATA_MODEL.md). */
export interface AppNotification {
  id: string
  /** What happened. Only "you were given access" exists so far. */
  type: 'shared'
  collection: SharedCollection
  targetId: string
  /** The list or plan name when the invitation was sent. */
  targetTitle: string
  role: MemberRole
  fromName: string
  /** ISO string. */
  createdAt: string
  read: boolean
}
