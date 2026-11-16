import { useTranslation } from 'react-i18next'
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus'
import Button from '../../shared/ui/Button/Button'
import Icon from '../../shared/ui/Icon/Icon'
import styles from '../../pages/SystemPage.module.css'

/**
 * What the page area shows instead of a black screen when a page could not be drawn: no
 * network (the same card as the offline page), a page file that a deploy has replaced, or
 * any other error. Reloading is the way out in all three cases.
 */
export default function LoadError({ stale }: { stale: boolean }) {
  const { t } = useTranslation()
  const online = useOnlineStatus()
  const [title, text] = !online
    ? [t('offline.title'), t('offline.text')]
    : stale
      ? [t('loadError.title'), t('loadError.text')]
      : [t('states.errorTitle'), t('states.errorBody')]
  return (
    <section className={styles.page} role="alert" aria-labelledby="load-error-title">
      <div className={styles.posters} aria-hidden="true">
        <span className={styles.poster} />
        <span className={styles.poster}>
          <Icon name={online ? 'refresh' : 'wifi-off'} size={28} />
        </span>
        <span className={styles.poster} />
      </div>
      <h1 id="load-error-title" className={styles.title}>
        {title}
      </h1>
      <p className={styles.text}>{text}</p>
      <div className={styles.actions}>
        <Button variant="primary" icon="refresh" onClick={() => window.location.reload()}>
          {online && stale ? t('loadError.reload') : t('offline.retry')}
        </Button>
      </div>
    </section>
  )
}
