import Button from '../components/Button/Button'
import ButtonLink from '../components/ButtonLink/ButtonLink'
import Icon from '../components/Icon/Icon'
import styles from './SystemPage.module.css'

/**
 * Shown when a page can't be reached without a network. The PWA phase makes the service
 * worker serve this route as the navigation fallback; until then it is reachable directly.
 */
export default function OfflinePage() {
  return (
    <section className={styles.page} aria-labelledby="offline-title">
      <title>Offline · Movietime</title>
      <div className={styles.posters} aria-hidden="true">
        <span className={styles.poster} />
        <span className={styles.poster}>
          <Icon name="wifi-off" size={28} />
        </span>
        <span className={styles.poster} />
      </div>
      <h1 id="offline-title" className={styles.title}>
        The projector’s off for a moment
      </h1>
      <p className={styles.text}>
        You’re offline. Your library and planned sessions saved on this device still work — anything
        you change will sync when you reconnect.
      </p>
      <div className={styles.actions}>
        {/* A full reload asks the network again, which is what "retry" means here. */}
        <Button variant="primary" icon="refresh" onClick={() => window.location.reload()}>
          Retry
        </Button>
        <ButtonLink to="/library" icon="bookmark">
          Go to library
        </ButtonLink>
      </div>
    </section>
  )
}
