import { useRegisterSW } from 'virtual:pwa-register/react'
import { useTranslation } from 'react-i18next'
import Toast from '../Toast/Toast'

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
      // A long-open tab never navigates, so ask for a new worker once an hour.
      if (registration) setInterval(() => void registration.update(), 60 * 60 * 1000)
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
