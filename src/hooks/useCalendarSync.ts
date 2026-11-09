import { useEffect } from 'react'
import { syncNow } from '../services/calendarService'
import { useAuth } from './useAuth'

const done = new Set<string>()

/**
 * Once per page load, a few seconds after sign-in: brings the Google Calendar up to date
 * with the plans (changes made on another device, a shared plan edited by someone else, the
 * 90-day window moving). Does nothing when the calendar isn't connected.
 */
export function useCalendarAutoSync() {
  const { user } = useAuth()
  const uid = user?.uid
  useEffect(() => {
    if (!uid || done.has(uid)) return
    const timer = setTimeout(() => {
      done.add(uid)
      void syncNow('all')
    }, 4000)
    return () => clearTimeout(timer)
  }, [uid])
}
