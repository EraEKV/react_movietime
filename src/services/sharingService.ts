import {
  arrayRemove,
  arrayUnion,
  deleteField,
  doc,
  FieldPath,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import type { MemberRole, SharedCollection, Visibility } from '../types/sharing'
import { normalizeEmail, validateInvite } from '../utils/sharing'
import { db } from './firestore'

// Sharing for lists and plans (docs/DATA_MODEL.md, "Sharing and roles"). There is no
// invitation server: the owner writes the friend's email into the document, and the rules
// read the signed-in user's email from the ID token. Every change is one updateDoc, so
// `roles` and `memberEmails` can never disagree.

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

/**
 * Owner only: gives an email access. Validates again (the dialog already did) so the
 * service can't be used to share with yourself or with a malformed address.
 */
export function addMember(
  collection: SharedCollection,
  id: string,
  roles: Record<string, MemberRole>,
  rawEmail: string,
  role: MemberRole,
  ownEmail: string | null,
): Promise<void> {
  const problem = validateInvite(rawEmail, { ownEmail, roles })
  if (problem) return Promise.reject(new Error(problem))
  const email = normalizeEmail(rawEmail)
  return updateDoc(
    ref(collection, id),
    roleField(email),
    role,
    // arrayUnion adds the email only if it isn't there yet.
    'memberEmails',
    arrayUnion(email),
    'updatedAt',
    serverTimestamp(),
  )
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
