import { useTranslation } from 'react-i18next'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import Icon from '../Icon/Icon'
import styles from './OfflinePill.module.css'

/** Header indicator, shown only while the browser has no network. */
export default function OfflinePill() {
  const { t } = useTranslation()
  const online = useOnlineStatus()
  if (online) return null
  return (
    <span className={styles.pill} role="status" title={t('pwa.statusLabel')}>
      <Icon name="wifi-off" size={16} />
      <span className={styles.text}>{t('pwa.status')}</span>
      <span className="sr-only">{t('pwa.statusLabel')}</span>
    </span>
  )
}
