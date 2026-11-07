import { sendMemberMail } from './_lib/memberMail.js'
import { roleChangedEmail } from './_lib/templates.js'

// POST /api/send-role-change { collection, id, email, locale }: tells a member their role
// changed. The role in the mail is the one stored on the list, not one sent by the client.
export const POST = (request: Request) =>
  sendMemberMail(request, (c) =>
    roleChangedEmail(c.locale, { owner: c.owner, name: c.name, role: c.role, url: c.openUrl }),
  )
