import { adminDb } from '../_lib/admin.js'
import { encrypt, verifyState } from '../_lib/gcalCrypto.js'
import { exchangeCode, googleConfig, SCOPE } from '../_lib/gcalGoogle.js'
import { LINKS } from '../_lib/gcalSync.js'
import { FieldValue } from 'firebase-admin/firestore'

// GET /api/google-calendar/callback?code&state: where Google sends the person back. The
// signed `state` says which account started the flow. The refresh token is stored encrypted
// and the person lands on Settings with ?calendar=connected | denied | error.

const settings = (request: Request, result: string) =>
  Response.redirect(new URL(`/profile/settings?calendar=${result}`, request.url).href, 302)

export async function GET(request: Request): Promise<Response> {
  const config = googleConfig()
  const db = adminDb()
  if (!config || !db) return settings(request, 'error')

  const params = new URL(request.url).searchParams
  if (params.get('error')) return settings(request, 'denied')
  const state = verifyState(params.get('state') ?? '', config.key)
  const code = params.get('code')
  if (!state || !code) return settings(request, 'error')

  const tokens = await exchangeCode(config, request.url, code)
  if (!tokens) return settings(request, 'error')
  // Google lets the person untick the permission on the consent screen.
  if (!tokens.scopes.includes(SCOPE) || !tokens.refreshToken) return settings(request, 'denied')

  await db
    .collection(LINKS)
    .doc(state.uid)
    .set(
      {
        refreshToken: encrypt(tokens.refreshToken, config.key),
        status: 'ok',
        connectedAt: FieldValue.serverTimestamp(),
        lastSyncAt: null,
      },
      { merge: true },
    )
  return settings(request, 'connected')
}
