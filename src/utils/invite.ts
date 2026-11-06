import type { SharedCollection } from '../types/sharing'
import { normalizeEmail, sharePath } from './sharing'

// Invite link for people who may not have an account yet:
//   /signup?invite=lists/<id>&email=<email>
// The sign-up form prefills the email, and after the email is verified the user lands on
// the list or plan (the same "return after sign-in" redirect the app already has).

/** Firestore ids are letters, digits, "-" and "_"; anything else is not an invite target. */
const INVITE_TARGET = /^(lists|plans)\/([A-Za-z0-9_-]{1,64})$/

export interface InviteTarget {
  collection: SharedCollection
  id: string
}

/** Reads the `invite` parameter. Only the two known collections and a plain id pass. */
export function parseInvite(value: string | null | undefined): InviteTarget | null {
  const match = value ? INVITE_TARGET.exec(value) : null
  if (!match) return null
  const [, collection, id] = match
  return { collection: collection as SharedCollection, id: id ?? '' }
}

/** App path an invite leads to, or `undefined` for a missing or malformed parameter. */
export function invitePath(value: string | null | undefined): string | undefined {
  const target = parseInvite(value)
  return target ? sharePath(target.collection, target.id) : undefined
}

/** Absolute link to send to the invited person. */
export function inviteUrl(collection: SharedCollection, id: string, email: string): string {
  const url = new URL('/signup', window.location.origin)
  url.searchParams.set('invite', `${collection}/${id}`)
  url.searchParams.set('email', normalizeEmail(email))
  return url.href
}

/** `mailto:` that opens the sender's mail app with the subject and message filled in. */
export function inviteMailto(email: string, subject: string, body: string): string {
  return `mailto:${encodeURIComponent(normalizeEmail(email))}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}
