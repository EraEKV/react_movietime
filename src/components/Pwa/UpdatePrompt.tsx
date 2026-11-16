import { useRegisterSW } from 'virtual:pwa-register/react'
import { useTranslation } from 'react-i18next'
import { recoverOnce } from '../../shared/lib/staleApp'
import Toast from '../../shared/ui/Toast/Toast'

/**
 * Registers the service worker and tells the user when a new version is waiting.
 * Reloading is the user's call: updateServiceWorker(true) asks the waiting worker to take
 * over (SKIP_WAITING in src/sw.ts) and reloads the page when it has.
 */
export default function UpdatePrompt() {
  const { t } = useTranslation()
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return
      const check = () => void registration.update().catch(() => undefined)
      // A long-open tab never navigates, so ask for a new worker once an hour.
      setInterval(check, 60 * 60 * 1000)
      // Safari checks for a new worker rarely, and an installed app is mostly resumed, not
      // opened: ask whenever the app comes back to the screen.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check()
      })
      // A worker already waiting when the app opens was downloaded earlier and never
      // accepted. Nothing is being edited yet, so take it now instead of showing an old
      // version until someone taps the toast.
      if (registration.waiting) recoverOnce()
    },
  })

  if (needRefresh) {
    return (
      <Toast
        icon="refresh"
        actionLabel={t('pwa.reload')}
        onAction={() => void updateServiceWorker(true)}
      >
        {t('pwa.updateReady')}
      </Toast>
    )
  }
  if (offlineReady) {
    return (
      <Toast
        icon="check"
        actionLabel={t('actions.close')}
        onAction={() => {
          setOfflineReady(false)
          setNeedRefresh(false)
        }}
      >
        {t('pwa.offlineReady')}
      </Toast>
    )
  }
  return null
}
