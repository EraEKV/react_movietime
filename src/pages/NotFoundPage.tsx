import ButtonLink from '../components/ButtonLink/ButtonLink'
import type { IconName } from '../components/Icon/icons'
import styles from './SystemPage.module.css'

interface NotFoundPageProps {
  /** Detail pages reuse it for "this list doesn't exist" with their own words. */
  title?: string
  text?: string
  secondary?: { to: string; label: string; icon: IconName }
}

export default function NotFoundPage({
  title = 'This reel is missing',
  text = 'The page you’re looking for was moved, deleted, or never existed. Check the link, or head back to something you know.',
  secondary = { to: '/library', label: 'Go to library', icon: 'bookmark' },
}: NotFoundPageProps) {
  return (
    <section className={styles.page} aria-labelledby="not-found-title">
      <title>{`${title} · Movietime`}</title>
      <p className={styles.code} aria-hidden="true">
        404
      </p>
      <h1 id="not-found-title" className={styles.title}>
        {title}
      </h1>
      <p className={styles.text}>{text}</p>
      <div className={styles.actions}>
        <ButtonLink to="/" variant="primary" icon="home">
          Go home
        </ButtonLink>
        <ButtonLink to={secondary.to} icon={secondary.icon}>
          {secondary.label}
        </ButtonLink>
      </div>
    </section>
  )
}
