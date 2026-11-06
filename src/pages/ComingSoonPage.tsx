import ButtonLink from '../components/ButtonLink/ButtonLink'
import EmptyState from '../components/EmptyState/EmptyState'
import type { IconName } from '../components/Icon/icons'
import styles from './ComingSoonPage.module.css'

interface ComingSoonPageProps {
  title: string
  icon: IconName
  /** What this section will hold, in the user's terms. */
  body: string
}

/**
 * Placeholder for a section whose route already exists but whose feature lands in a later
 * phase. The route tree and the navigation stay complete, so no link leads to a 404.
 */
export default function ComingSoonPage({ title, icon, body }: ComingSoonPageProps) {
  return (
    <section className={styles.page} aria-labelledby="coming-soon-title">
      <title>{`${title} · Movietime`}</title>
      <h1 id="coming-soon-title" className={styles.title}>
        {title}
      </h1>
      <EmptyState
        icon={icon}
        title="Coming soon"
        body={body}
        actions={
          <ButtonLink to="/series" variant="primary" icon="compass">
            Explore series
          </ButtonLink>
        }
      />
    </section>
  )
}
