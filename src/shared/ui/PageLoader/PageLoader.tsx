import { useTranslation } from 'react-i18next'
import Skeleton from '../Skeleton/Skeleton'
import styles from './PageLoader.module.css'

/**
 * Shown while the first auth state is unknown (usually a few hundred ms on reload)
 * and while a lazy page's chunk is downloading.
 * A neutral page-shaped skeleton, not a spinner: the layout doesn't jump when content arrives.
 */
export default function PageLoader() {
  const { t } = useTranslation()
  return (
    <div className={styles.loader} role="status" aria-live="polite">
      <span className="sr-only">{t('states.loading')}</span>
      <Skeleton width="40%" height={32} radius="sm" />
      <Skeleton width="70%" height={16} />
      <Skeleton width="55%" height={16} />
    </div>
  )
}
