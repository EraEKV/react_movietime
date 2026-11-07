import { useTranslation } from 'react-i18next'
import Banner from '../../shared/ui/Banner/Banner'
import Switch from '../../shared/ui/Switch/Switch'
import { usePushNotifications } from '../../hooks/usePushNotifications'
import styles from '../../pages/SettingsPage.module.css'

/**
 * The switch for push notifications on this device. It asks the browser for permission only
 * when turned on. States that can't be switched explain why instead of hiding the setting.
 */
export default function PushSettings() {
  const { t } = useTranslation('profile', { keyPrefix: 'settings.push' })
  const { state, busy, failed, toggle } = usePushNotifications()

  if (state === 'checking') return null
  const blocked = state !== 'on' && state !== 'off'

  return (
    <div className={styles.field}>
      <Switch
        label={t('label')}
        description={t(blocked ? `blocked.${state}` : 'hint')}
        checked={state === 'on'}
        disabled={blocked || busy}
        onChange={(on) => void toggle(on)}
      />
      {failed && <Banner tone="warning">{t('failed')}</Banner>}
    </div>
  )
}
