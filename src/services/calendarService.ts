import { auth } from './firebase'

// Browser side of the Google Calendar sync (api/google-calendar/*). The server holds the
// tokens and does the work; this file only asks. Plans stay the source of truth: the
// calendar is a one-way copy, so nothing here can fail a plan change.

export type CalendarStatus =
  | { state: 'unavailable' } // not configured on the server, or no server at all (vite dev)
  | { state: 'disconnected' }
  | { state: 'connected'; revoked: boolean; lastSyncAt: number | null }

const ENDPOINT = '/api/google-calendar'

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await auth.currentUser?.getIdToken()
  if (!token) throw new Error('unauthenticated')
  return fetch(`${ENDPOINT}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
  })
}

let known: CalendarStatus | null = null

export async function loadStatus(force = false): Promise<CalendarStatus> {
  if (known && !force) return known
  try {
    const response = await request('')
    const body = response.ok
      ? ((await response.json()) as {
          configured?: boolean
          connected?: boolean
          status?: string
          lastSyncAt?: number | null
        })
      : null
    known = !body?.configured
      ? { state: 'unavailable' }
      : body.connected
        ? {
            state: 'connected',
            revoked: body.status === 'revoked',
            lastSyncAt: body.lastSyncAt ?? null,
          }
        : { state: 'disconnected' }
  } catch {
    known = { state: 'unavailable' }
  }
  return known
}

/** Sends the person to Google's consent screen; they come back to Settings. */
export async function connectCalendar(): Promise<void> {
  const response = await request('', { method: 'POST' })
  const body = (await response.json().catch(() => null)) as { url?: string } | null
  if (!response.ok || !body?.url) throw new Error('connect-failed')
  window.location.assign(body.url)
}

export async function disconnectCalendar(): Promise<void> {
  const response = await request('', { method: 'DELETE' })
  known = null
  if (!response.ok) throw new Error('disconnect-failed')
}

const timeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone

/** One sync run. Resolves to false when it didn't happen (not connected, revoked, offline). */
export async function syncNow(planId: string | 'all'): Promise<boolean> {
  try {
    const status = await loadStatus()
    if (status.state !== 'connected' || status.revoked) return false
    const response = await request('/sync', {
      method: 'POST',
      body: JSON.stringify({ planId, timeZone: timeZone() }),
    })
    if (response.status === 409) known = null // revoked or disconnected elsewhere: look again
    if (response.ok && known?.state === 'connected') known = { ...known, lastSyncAt: Date.now() }
    return response.ok
  } catch {
    return false
  }
}

// Plan changes arrive in bursts (mark watched, then reschedule, then …): wait a moment,
// then sync that plan once. Runs go one after another so two never race on the same events.
const pending = new Map<string, ReturnType<typeof setTimeout>>()
let queue: Promise<unknown> = Promise.resolve()

export function requestSync(planId: string, delay = 1500): void {
  clearTimeout(pending.get(planId))
  pending.set(
    planId,
    setTimeout(() => {
      pending.delete(planId)
      queue = queue.then(() => syncNow(planId))
    }, delay),
  )
}
