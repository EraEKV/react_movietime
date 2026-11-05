import ButtonLink from '../components/ButtonLink/ButtonLink'
import styles from './NotFoundPage.module.css'

export default function NotFoundPage() {
  return (
    <section className={styles.page} aria-labelledby="not-found-title">
      <title>Page not found · Movietime</title>
      <p className={styles.code} aria-hidden="true">
        404
      </p>
      <h1 id="not-found-title" className={styles.title}>
        This reel is missing
      </h1>
      <p className={styles.text}>
        The page you’re looking for was moved, deleted, or never existed. Check the link, or head
        back to something you know.
      </p>
      <div className={styles.actions}>
        <ButtonLink to="/" variant="primary" icon="home">
          Go home
        </ButtonLink>
        <ButtonLink to="/watchlist" icon="bookmark">
          Go to library
        </ButtonLink>
      </div>
    </section>
  )
}
