import type { Firestore } from 'firebase-admin/firestore'
import { adminDb } from './admin.js'
import { bearer, json, verifyToken, type Caller } from './firebase.js'
import { googleConfig, type GoogleConfig } from './gcalGoogle.js'

export interface CalendarContext {
  db: Firestore
  config: GoogleConfig
  caller: Caller
}

/** The signed-in caller with the server pieces, or the error response to return. */
export async function calendarContext(request: Request): Promise<CalendarContext | Response> {
  const config = googleConfig()
  const db = adminDb()
  const apiKey = process.env.VITE_FIREBASE_API_KEY
  if (!config || !db || !apiKey) return json({ error: 'not-configured' }, 503)
  const token = bearer(request)
  const caller = token ? await verifyToken({ apiKey }, token) : null
  if (!caller) return json({ error: 'unauthenticated' }, 401)
  return { db, config, caller }
}
