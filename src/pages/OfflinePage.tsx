import { useTranslation } from 'react-i18next'
import Button from '../shared/ui/Button/Button'
import ButtonLink from '../shared/ui/ButtonLink/ButtonLink'
import Icon from '../shared/ui/Icon/Icon'
import styles from './SystemPage.module.css'

/**
 * Shown when a page can't be reached without a network. The PWA phase makes the service
 * worker serve this route as the navigation fallback; until then it is reachable directly.
 */
export default function OfflinePage() {
  const { t } = useTranslation()
  return (
    <section className={styles.page} aria-labelledby="offline-title">
      <title>{t('offline.pageTitle')}</title>
      <div className={styles.posters} aria-hidden="true">
        <span className={styles.poster} />
        <span className={styles.poster}>
          <Icon name="wifi-off" size={28} />
        </span>
        <span className={styles.poster} />
      </div>
      <h1 id="offline-title" className={styles.title}>
        {t('offline.title')}
      </h1>
      <p className={styles.text}>{t('offline.text')}</p>
      <div className={styles.actions}>
        {/* A full reload asks the network again, which is what "retry" means here. */}
        <Button variant="primary" icon="refresh" onClick={() => window.location.reload()}>
          {t('offline.retry')}
        </Button>
        <ButtonLink to="/library" icon="bookmark">
          {t('notFound.library')}
        </ButtonLink>
      </div>
    </section>
  )
}
