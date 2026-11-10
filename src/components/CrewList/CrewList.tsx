import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import Button from '../../shared/ui/Button/Button'
import type { KeyCrewMember } from '../../utils/person'
import styles from './CrewList.module.css'

/** How many people show before "Show all". */
export const CREW_PREVIEW = 12

/** Key crew (director, writers, composer…) as links to their pages. */
export default function CrewList({ crew }: { crew: KeyCrewMember[] }) {
  const { t } = useTranslation('person')
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? crew : crew.slice(0, CREW_PREVIEW)

  return (
    <>
      <ul className={styles.list} aria-label={t('crewLabel')}>
        {visible.map((person) => (
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
      {crew.length > CREW_PREVIEW && (
        <Button
          variant="ghost"
          className={styles.toggle}
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? t('showFewer') : t('showAll', { count: crew.length })}
        </Button>
      )}
    </>
  )
}
