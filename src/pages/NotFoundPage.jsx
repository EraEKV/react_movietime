import { Link } from 'react-router'
import StatusMessage from '../components/StatusMessage/StatusMessage.jsx'
import styles from './NotFoundPage.module.css'

export default function NotFoundPage() {
  return (
    <section className={styles.page}>
      <title>Page not found · Movietime</title>
      <p className={styles.code} aria-hidden="true">
        404
      </p>
      <StatusMessage
        title="This page doesn't exist"
        action={
          <div className={styles.actions}>
            <Link to="/" className={styles.primary}>
              Discover series
            </Link>
            <Link to="/watchlist" className={styles.secondary}>
              Open watchlist
            </Link>
          </div>
        }
      >
        The link may be broken, or the page was moved.
      </StatusMessage>
    </section>
  )
}
