import { sendMemberMail } from './_lib/memberMail.js'
import { inviteEmail } from './_lib/templates.js'

// POST /api/send-invite { collection, id, email, locale }: the invite link by email.
// Env (Vercel): RESEND_API_KEY, RESEND_FROM ("Movietime <invites@avleron.com>"),
// VITE_FIREBASE_API_KEY and VITE_FIREBASE_PROJECT_ID (already set for the build).
export const POST = (request: Request) =>
  sendMemberMail(request, (c) =>
    inviteEmail(c.locale, { owner: c.owner, name: c.name, role: c.role, url: c.signupUrl }),
  )
