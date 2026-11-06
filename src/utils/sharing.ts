import i18n from '../shared/i18n'
// Pure helpers for sharing lists and plans: roles, invite validation, member display.
import type { AuthUser } from '../types/auth'
import type { Member, MemberRole, Shareable, SharedCollection, ShareRole } from '../types/sharing'
import { validateEmail } from '../shared/lib/validation'

/** Same limit as firestore.rules (validSharing): keeps the document and the rules cheap. */
export const MAX_MEMBERS = 20

/** Emails are stored lowercase: rules compare them with `request.auth.token.email.lower()`. */
export const normalizeEmail = (value: string) => value.trim().toLowerCase()

type Viewer = Pick<AuthUser, 'uid' | 'email' | 'emailVerified'> | null

/**
 * The current user's role on a shared document, mirroring the rules:
 * owner by uid; editor/viewer by email, but only with a verified email (rules check
 * `email_verified`, so an unverified member is treated as a stranger); anyone else is a
 * link visitor when the link is on. `null` = no access.
 */
export function roleOf(doc: Shareable, user: Viewer): ShareRole | null {
  if (user && doc.ownerUid === user.uid) return 'owner'
  const memberRole =
    user?.emailVerified && user.email ? doc.roles[normalizeEmail(user.email)] : undefined
  if (memberRole) return memberRole
  return doc.visibility === 'link' ? 'link' : null
}

/** Members sorted for display: editors first, then by email. */
export function membersOf(doc: Pick<Shareable, 'roles'>): Member[] {
  return Object.entries(doc.roles)
    .map(([email, role]) => ({ email, role }))
    .toSorted((a, b) =>
      a.role === b.role ? a.email.localeCompare(b.email) : a.role === 'editor' ? -1 : 1,
    )
}

/**
 * Checks an invite before it is sent. Returns the error sentence, or null when it's fine.
 * The rules can't tell whether an email is real, so this is about obvious mistakes.
 */
export function validateInvite(
  raw: string,
  { ownEmail, roles }: { ownEmail: string | null; roles: Record<string, MemberRole> },
): string | null {
  const email = normalizeEmail(raw)
  if (!email) return i18n.t('sharing:invite.enterEmail')
  if (validateEmail(email)) return i18n.t('sharing:invite.fullEmail')
  if (ownEmail && email === normalizeEmail(ownEmail)) return i18n.t('sharing:invite.ownEmail')
  if (roles[email]) return i18n.t('sharing:invite.already')
  if (Object.keys(roles).length >= MAX_MEMBERS) {
    return i18n.t('sharing:invite.max', { count: MAX_MEMBERS })
  }
  return null
}

/** Only emails are stored for members, so the part before "@" stands in for a name. */
export const memberName = (email: string) => email.split('@')[0] || email

/** App path of a shared document; the page there decides what the visitor can do. */
export const sharePath = (collection: SharedCollection, id: string) =>
  collection === 'lists' ? `/lists/${id}` : `/planner/${id}`

/** Full URL to send to a friend. */
export const shareUrl = (collection: SharedCollection, id: string) =>
  new URL(sharePath(collection, id), window.location.origin).href

export const roleLabel = (role: MemberRole): string => i18n.t(`role.${role}`)
