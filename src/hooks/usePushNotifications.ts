import { useCallback, useEffect, useState } from 'react'
import type * as PushService from '../services/pushService'
import { useAppSelector } from '../store/hooks'
import { selectLanguage } from '../store/preferencesSlice'

/** Loaded on first use: the settings page is the only place that needs it. */
const loadPush = (): Promise<typeof PushService> => import('../services/pushService')

/**
 * Push notifications of this browser for the settings switch. `state` follows the browser
 * (permission + subscription); `toggle` runs the permission prompt, so call it from a tap.
 */
export function usePushNotifications() {
  const language = useAppSelector(selectLanguage)
  const [state, setState] = useState<PushService.PushState | 'checking'>('checking')
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    void loadPush()
      .then((push) => push.pushState())
      .then((next) => !cancelled && setState(next))
      .catch(() => !cancelled && setState('unsupported'))
    return () => {
      cancelled = true
    }
  }, [])

  // Notifications are written in the language saved with the subscription.
  useEffect(() => {
    if (state === 'on')
      void loadPush()
        .then((push) => push.refreshPushLocale(language))
        .catch(() => undefined)
  }, [language, state])

  const toggle = useCallback(
    async (on: boolean) => {
      setBusy(true)
      setFailed(false)
      try {
        const push = await loadPush()
        setState(on ? await push.enablePush(language) : await push.disablePush())
      } catch {
        setFailed(true)
        setState(await (await loadPush()).pushState().catch(() => 'unsupported' as const))
      } finally {
        setBusy(false)
      }
    },
    [language],
  )

  return { state, busy, failed, toggle }
}
