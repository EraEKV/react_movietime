import i18n from '../../i18n'
import ButtonLink from '../ButtonLink/ButtonLink'
import Icon from '../Icon/Icon'
import styles from './MarathonCard.module.css'

/** List page: turns the list's movies into a plan, one movie per evening. */
export default function MarathonCard({ listId, movies }: { listId: string; movies: number }) {
  return (
    <section className={styles.card} aria-labelledby="marathon-title">
      <span className={styles.icon} aria-hidden="true">
        <Icon name="calendar" size={24} />
      </span>
      <div className={styles.text}>
        <h2 id="marathon-title" className={styles.title}>
          Plan a movie marathon
        </h2>
        <p className={styles.body}>
          {i18n.t('count.movies', { count: movies })}, one per evening on the days you pick.
          Movietime works out the finish date.
        </p>
      </div>
      <ButtonLink to={`/planner/new?list=${listId}`} variant="primary" icon="plus">
        Plan it
      </ButtonLink>
    </section>
  )
}
