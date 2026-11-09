import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import type { KeyCrewMember } from '../../utils/person'
import styles from './CrewList.module.css'

/** Key crew (director, writers, composer…) as links to their pages. */
export default function CrewList({ crew }: { crew: KeyCrewMember[] }) {
  const { t } = useTranslation('person')
  return (
    <ul className={styles.list} aria-label={t('crewLabel')}>
      {crew.map((person) => (
        <li key={person.id}>
          <Link to={`/person/${person.id}`} className={styles.link}>
            <span className={styles.name}>{person.name}</span>
            <span className={styles.jobs}>
              {person.jobs.map((job) => t(`jobs.${job}`)).join(', ')}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
