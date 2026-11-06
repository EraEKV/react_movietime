import type { LibraryStatus } from './library'
import type { MediaKey } from './media'

/** What happened. The same list is checked by validActivity() in firestore.rules. */
export type ActivityType =
  'library.add' | 'library.status' | 'list.create' | 'plan.create' | 'session.done' | 'plan.done'

/** Extra details some types carry (all optional, all small). */
export interface ActivityMeta {
  /** library.add / library.status: the status after the change. */
  status?: LibraryStatus
  /** session.done: "S2E3–E4" or movie titles. */
  units?: string
  /** plan.create: how many sessions were planned. */
  sessions?: number
}

/** What a service writes to `users/{uid}/activity` (createdAt is added on write). */
export interface ActivityDraft {
  type: ActivityType
  title: string
  mediaKey?: MediaKey
  /** List or plan id. */
  refId?: string
  meta?: ActivityMeta
}

/** One feed row as the app reads it: createdAt is an ISO string. */
export interface ActivityItem extends ActivityDraft {
  id: string
  createdAt: string
}
