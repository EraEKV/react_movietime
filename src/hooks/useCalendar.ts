import { useCallback, useEffect, useState } from 'react'
import {
  connectCalendar,
  disconnectCalendar,
  loadStatus,
  syncNow,
  type CalendarStatus,
} from '../services/calendarService'

/** The Google Calendar link for the Settings card: its state and the three actions. */
export function useCalendar() {
  const [status, setStatus] = useState<CalendarStatus | null>(null)
  const [busy, setBusy] = useState<'connect' | 'sync' | 'disconnect' | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    void loadStatus(true).then((next) => !cancelled && setStatus(next))
    return () => {
      cancelled = true
    }
  }, [])

  const run = useCallback(async (action: 'connect' | 'sync' | 'disconnect') => {
    setBusy(action)
    setFailed(false)
    try {
      if (action === 'connect') {
        await connectCalendar() // leaves the page; busy stays on until it does
        return
      }
      if (action === 'sync') {
        if (!(await syncNow('all'))) throw new Error('sync-failed')
      } else {
        await disconnectCalendar()
      }
      setStatus(await loadStatus(true))
    } catch {
      setFailed(true)
    }
    setBusy(null)
  }, [])

  return {
    status,
    busy,
    failed,
    connect: () => run('connect'),
    sync: () => run('sync'),
    disconnect: () => run('disconnect'),
  }
}
