import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { cx } from '../../shared/lib/cx'
import Button from '../../shared/ui/Button/Button'
import type { CastMember } from '../../types/tmdb'
import PersonPhoto from '../PersonPhoto/PersonPhoto'
import styles from './CastList.module.css'

/** How many people show in the row before "Show all". */
export const CAST_PREVIEW = 12

/** A row of the first CAST_PREVIEW people; "Show all" turns it into a wrapping grid of everyone. */
export default function CastList({ cast }: { cast: CastMember[] }) {
  const { t } = useTranslation('person')
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? cast : cast.slice(0, CAST_PREVIEW)

  return (
    <>
      <ul className={cx(styles.list, expanded && styles.expanded)}>
        {visible.map((person) => {
          return (
            // credit_id is unique per role; the same actor can appear twice with different roles.
            <li key={person.credit_id} className={styles.person}>
              <Link
                to={`/person/${person.id}`}
                className={styles.link}
                aria-label={
                  person.character
                    ? `${t('profileLink', { name: person.name })} · ${person.character}`
                    : t('profileLink', { name: person.name })
                }
              >
                <div className={styles.photo}>
                  <PersonPhoto path={person.profile_path} size="w185" />
                </div>
                <p className={styles.name}>{person.name}</p>
                {person.character && (
                  <p className={styles.character} title={person.character}>
                    {person.character}
                  </p>
                )}
              </Link>
            </li>
          )
        })}
      </ul>
      {cast.length > CAST_PREVIEW && (
        <Button
          variant="ghost"
          className={styles.toggle}
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? t('showFewer') : t('showAll', { count: cast.length })}
        </Button>
      )}
    </>
  )
}
