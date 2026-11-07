// Server-side helpers for the mail endpoints. There is no Firebase Admin here on purpose:
// the caller's own ID token is verified through the Identity Toolkit REST API and used to
// read Firestore, so the security rules decide what the caller may touch.

export interface Field {
  stringValue?: string
  arrayValue?: { values?: Field[] }
  mapValue?: { fields?: Record<string, Field> }
}

export interface Caller {
  uid: string
  email: string
  emailVerified: boolean
  displayName: string
}

export interface FirestoreDoc {
  fields: Record<string, Field>
  updateTime: string
}

export interface MailEnv {
  resendKey: string
  from: string
  apiKey: string
  projectId: string
}

export const json = (body: object, status = 200) => Response.json(body, { status })

/** The env the endpoints need, or null when something is missing (→ 503). */
export function readEnv(): MailEnv | null {
  const { RESEND_API_KEY, RESEND_FROM, VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID } =
    process.env
  if (!RESEND_API_KEY || !RESEND_FROM || !VITE_FIREBASE_API_KEY || !VITE_FIREBASE_PROJECT_ID) {
    return null
  }
  return {
    resendKey: RESEND_API_KEY,
    from: RESEND_FROM,
    apiKey: VITE_FIREBASE_API_KEY,
    projectId: VITE_FIREBASE_PROJECT_ID,
  }
}

export const bearer = (request: Request) =>
  request.headers.get('authorization')?.replace(/^Bearer /, '') ?? ''

/** Who is calling: Firebase checks the token's signature and expiry. */
export async function verifyToken(env: MailEnv, idToken: string): Promise<Caller | null> {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${env.apiKey}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ idToken }),
    },
  )
  if (!response.ok) return null
  const { users } = (await response.json()) as {
    users?: { localId: string; email?: string; emailVerified?: boolean; displayName?: string }[]
  }
  const user = users?.[0]
  if (!user) return null
  return {
    uid: user.localId,
    email: (user.email ?? '').toLowerCase(),
    emailVerified: user.emailVerified === true,
    displayName: user.displayName ?? '',
  }
}

const documentsUrl = (env: MailEnv) =>
  `https://firestore.googleapis.com/v1/projects/${env.projectId}/databases/(default)/documents`

/** A document read as the caller; null when missing or not readable for them. */
export async function readDoc(
  env: MailEnv,
  idToken: string,
  path: string,
): Promise<FirestoreDoc | null> {
  const response = await fetch(`${documentsUrl(env)}/${path}`, {
    headers: { authorization: `Bearer ${idToken}` },
  })
  if (!response.ok) return null
  const body = (await response.json()) as { fields?: Record<string, Field>; updateTime: string }
  return { fields: body.fields ?? {}, updateTime: body.updateTime }
}

/**
 * Sets (or, with `clear`, removes) `users/{uid}.welcomedAt`, only if the document is still
 * the version that was read. Two calls at once can't both win: the second one fails the
 * precondition and nothing is sent twice. Returns whether the write happened.
 */
export async function markWelcomed(
  env: MailEnv,
  idToken: string,
  uid: string,
  doc: FirestoreDoc,
  clear = false,
): Promise<boolean> {
  const name = `projects/${env.projectId}/databases/(default)/documents/users/${uid}`
  const response = await fetch(`${documentsUrl(env)}:commit`, {
    method: 'POST',
    headers: { authorization: `Bearer ${idToken}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      writes: [
        {
          // An empty `fields` with this mask deletes welcomedAt; the transform sets it.
          update: { name, fields: {} },
          updateMask: { fieldPaths: ['welcomedAt'] },
          updateTransforms: [
            ...(clear ? [] : [{ fieldPath: 'welcomedAt', setToServerValue: 'REQUEST_TIME' }]),
            { fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' },
          ],
          currentDocument: { updateTime: doc.updateTime },
        },
      ],
    }),
  })
  return response.ok
}
