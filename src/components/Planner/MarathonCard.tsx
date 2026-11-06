import { useTranslation } from 'react-i18next'
import ButtonLink from '../ButtonLink/ButtonLink'
import Icon from '../Icon/Icon'
import styles from './MarathonCard.module.css'

/** List page: turns the list's movies into a plan, one movie per evening. */
export default function MarathonCard({ listId, movies }: { listId: string; movies: number }) {
  const { t } = useTranslation(['planner', 'common'])
  return (
    <section className={styles.card} aria-labelledby="marathon-title">
      <span className={styles.icon} aria-hidden="true">
        <Icon name="calendar" size={24} />
      </span>
      <div className={styles.text}>
        <h2 id="marathon-title" className={styles.title}>
          {t('marathon.title')}
        </h2>
        <p className={styles.body}>
          {t('marathon.body', { movies: t('common:count.movies', { count: movies }) })}
        </p>
      </div>
      <ButtonLink to={`/planner/new?list=${listId}`} variant="primary" icon="plus">
        {t('marathon.plan')}
      </ButtonLink>
    </section>
  )
}
