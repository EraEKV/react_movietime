import { parseKey } from './gcalCrypto.js'
import type { DesiredEvent, ExistingEvent } from './gcalEvents.js'

// Thin fetch client for the two Google endpoints the sync needs: OAuth (token exchange,
// refresh, revoke) and Calendar v3 events. No SDK on purpose: it is a handful of calls.

export const SCOPE = 'https://www.googleapis.com/auth/calendar.events'

export interface GoogleConfig {
  clientId: string
  clientSecret: string
  key: Buffer
  /** Optional: GOOGLE_REDIRECT_URI. Otherwise it is built from the request's origin. */
  redirectUri: string | null
}

/** The OAuth settings, or null when something is missing (→ 503 "not configured"). */
export function googleConfig(): GoogleConfig | null {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, CALENDAR_TOKEN_KEY, GOOGLE_REDIRECT_URI } =
    process.env
  const key = parseKey(CALENDAR_TOKEN_KEY)
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !key) return null
  return {
    clientId: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    key,
    redirectUri: GOOGLE_REDIRECT_URI || null,
  }
}

export const redirectUriFor = (config: GoogleConfig, requestUrl: string) =>
  config.redirectUri ?? new URL('/api/google-calendar/callback', requestUrl).href

/** Where the person goes to say yes. offline + consent make Google issue a refresh token. */
export function authUrl(config: GoogleConfig, requestUrl: string, state: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUriFor(config, requestUrl),
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

/** The refresh token has been revoked or expired: the person has to connect again. */
export class GrantRevokedError extends Error {}

export class CalendarApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

const tokenEndpoint = 'https://oauth2.googleapis.com/token'

async function tokenRequest(params: Record<string, string>) {
  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  })
  const body = (await response.json().catch(() => ({}))) as {
    access_token?: string
    refresh_token?: string
    scope?: string
    error?: string
  }
  return { ok: response.ok, body }
}

export async function exchangeCode(config: GoogleConfig, requestUrl: string, code: string) {
  const { ok, body } = await tokenRequest({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: redirectUriFor(config, requestUrl),
    grant_type: 'authorization_code',
  })
  if (!ok || !body.access_token) return null
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token ?? null,
    scopes: (body.scope ?? '').split(' '),
  }
}

export async function accessTokenFor(config: GoogleConfig, refreshToken: string): Promise<string> {
  const { ok, body } = await tokenRequest({
    refresh_token: refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: 'refresh_token',
  })
  if (ok && body.access_token) return body.access_token
  if (body.error === 'invalid_grant') throw new GrantRevokedError()
  throw new CalendarApiError(502, `Token refresh failed: ${body.error ?? 'unknown'}`)
}

export async function revoke(token: string): Promise<void> {
  await fetch('https://oauth2.googleapis.com/revoke', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token }),
  }).catch(() => undefined)
}

const eventsUrl = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** One Calendar call. Rate limits and 5xx are retried a few times with a growing pause. */
async function calendar(accessToken: string, method: string, url: string, body?: object) {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(url, {
      method,
      headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    const retryable = response.status === 429 || response.status >= 500 || response.status === 403
    if (retryable && attempt < 3) {
      const reason = response.status === 403 ? await response.clone().text() : 'rate'
      if (response.status !== 403 || /rateLimitExceeded|userRateLimitExceeded/.test(reason)) {
        await sleep(400 * 2 ** attempt)
        continue
      }
    }
    if (response.status === 401) throw new GrantRevokedError()
    return response
  }
}

interface RawEvent {
  id: string
  extendedProperties?: { private?: Record<string, string> }
}

/** Every event the app made, optionally for one plan. */
export async function listAppEvents(
  accessToken: string,
  planId?: string,
): Promise<ExistingEvent[]> {
  const found: ExistingEvent[] = []
  let pageToken: string | undefined
  do {
    const params = new URLSearchParams({
      maxResults: '2500',
      fields: 'nextPageToken,items(id,extendedProperties/private)',
    })
    params.append('privateExtendedProperty', 'movietimeApp=1')
    if (planId) params.append('privateExtendedProperty', `movietimePlanId=${planId}`)
    if (pageToken) params.set('pageToken', pageToken)
    const response = await calendar(accessToken, 'GET', `${eventsUrl}?${params}`)
    if (!response.ok) throw new CalendarApiError(response.status, 'Listing events failed')
    const page = (await response.json()) as { items?: RawEvent[]; nextPageToken?: string }
    for (const item of page.items ?? []) {
      const p = item.extendedProperties?.private
      if (p?.movietimeSessionId) {
        found.push({
          id: item.id,
          planId: p.movietimePlanId ?? '',
          sessionId: p.movietimeSessionId,
          hash: p.movietimeHash ?? '',
        })
      }
    }
    pageToken = page.nextPageToken
  } while (pageToken)
  return found
}

/** Creates the event; if its (deterministic) id exists already, e.g. it was deleted by hand, it is brought back. */
export async function insertEvent(accessToken: string, event: DesiredEvent): Promise<void> {
  const response = await calendar(accessToken, 'POST', eventsUrl, event.body)
  if (response.status === 409) return patchEvent(accessToken, event)
  if (!response.ok) throw new CalendarApiError(response.status, 'Creating an event failed')
}

export async function patchEvent(accessToken: string, event: DesiredEvent): Promise<void> {
  const response = await calendar(accessToken, 'PATCH', `${eventsUrl}/${event.id}`, {
    ...event.body,
    status: 'confirmed',
  })
  if (!response.ok) throw new CalendarApiError(response.status, 'Updating an event failed')
}

export async function deleteEvent(accessToken: string, id: string): Promise<void> {
  const response = await calendar(accessToken, 'DELETE', `${eventsUrl}/${id}`)
  // 404/410: already gone, which is what we wanted.
  if (!response.ok && response.status !== 404 && response.status !== 410) {
    throw new CalendarApiError(response.status, 'Deleting an event failed')
  }
}
