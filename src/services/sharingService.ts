import {
  arrayRemove,
  arrayUnion,
  deleteField,
  doc,
  FieldPath,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import type { MemberRole, SharedCollection, Visibility } from '../types/sharing'
import { normalizeEmail, validateInvite } from '../utils/sharing'
import { db } from './firestore'
import { addSharedNotice } from './notificationsService'

// Sharing for lists and plans (docs/DATA_MODEL.md, "Sharing and roles"). There is no
// invitation server: the owner writes the friend's email into the document, and the rules
// read the signed-in user's email from the ID token. Every change is one write, so
// `roles` and `memberEmails` can never disagree; adding someone also writes an in-app
// notification in the same batch (notificationsService).

const ref = (collection: SharedCollection, id: string) => doc(db, collection, id)

/**
 * The field path of one member's role. An email contains dots, and in a string path a dot
 * means nesting: "roles.dan@gmail.com" would be roles → "dan@gmail" → "com".
 * FieldPath keeps the whole email as one map key.
 */
const roleField = (email: string) => new FieldPath('roles', email)

/** Owner only (rules): link on = anyone with the URL can read. */
export function setVisibility(
  collection: SharedCollection,
  id: string,
  visibility: Visibility,
): Promise<void> {
  return updateDoc(ref(collection, id), { visibility, updatedAt: serverTimestamp() })
}

/** Who is inviting to what: the notification text and the rules' ownership check. */
export interface InviteContext {
  ownEmail: string | null
  ownerUid: string
  ownerName: string
  /** Name of the list or plan, shown in the notification. */
  title: string
}

/**
 * Owner only: gives an email access and leaves a notification for it. Validates again
 * (the dialog already did) so the service can't be used to share with yourself or with a
 * malformed address. One batch: the access and the notification are written together
 * (the rules accept the notification only together with this change).
 */
export async function addMember(
  collection: SharedCollection,
  id: string,
  roles: Record<string, MemberRole>,
  rawEmail: string,
  role: MemberRole,
  context: InviteContext,
): Promise<void> {
  const problem = validateInvite(rawEmail, { ownEmail: context.ownEmail, roles })
  if (problem) throw new Error(problem)
  const email = normalizeEmail(rawEmail)
  const batch = writeBatch(db)
  batch.update(
    ref(collection, id),
    roleField(email),
    role,
    // arrayUnion adds the email only if it isn't there yet.
    'memberEmails',
    arrayUnion(email),
    'updatedAt',
    serverTimestamp(),
  )
  addSharedNotice(batch, {
    toEmail: email,
    collection,
    targetId: id,
    targetTitle: context.title,
    role,
    fromUid: context.ownerUid,
    fromName: context.ownerName,
  })
  await batch.commit()
}

/** Owner only: editor ⇄ viewer. */
export function changeRole(
  collection: SharedCollection,
  id: string,
  email: string,
  role: MemberRole,
): Promise<void> {
  return updateDoc(ref(collection, id), roleField(email), role, 'updatedAt', serverTimestamp())
}

/** Owner only: takes access away. deleteField() removes the key from the roles map. */
export function removeMember(
  collection: SharedCollection,
  id: string,
  email: string,
): Promise<void> {
  return updateDoc(
    ref(collection, id),
    roleField(normalizeEmail(email)),
    deleteField(),
    'memberEmails',
    arrayRemove(normalizeEmail(email)),
    'updatedAt',
    serverTimestamp(),
  )
}

/**
 * A member removes themselves. The write is the same as removeMember; the rules
 * (isLeaving) allow it for a non-owner only when the removed email is their own.
 */
export const leave = (collection: SharedCollection, id: string, ownEmail: string) =>
  removeMember(collection, id, ownEmail)
