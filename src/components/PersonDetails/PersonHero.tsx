import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatDate } from '../../shared/lib/format'
import Button from '../../shared/ui/Button/Button'
import type { PersonDetails } from '../../types/tmdb'
import { biographyOf } from '../../utils/person'
import PersonPhoto from '../PersonPhoto/PersonPhoto'
import styles from './PersonDetails.module.css'

/** Longer than this and the biography starts folded. */
const LONG_BIO = 700

const KNOWN_DEPARTMENTS = ['Acting', 'Directing', 'Writing'] as const
type KnownDepartment = (typeof KNOWN_DEPARTMENTS)[number]
const isKnownDepartment = (value: string): value is KnownDepartment =>
  (KNOWN_DEPARTMENTS as readonly string[]).includes(value)

export default function PersonHero({ person }: { person: PersonDetails }) {
  const { t } = useTranslation('person')
  const [expanded, setExpanded] = useState(false)
  const biography = biographyOf(person)
  const paragraphs = biography.split(/\r?\n(?:\s*\r?\n)+/).filter(Boolean)
  const folded = biography.length > LONG_BIO && !expanded

  const facts = [
    { label: t('facts.born'), value: formatDate(person.birthday) },
    { label: t('facts.died'), value: formatDate(person.deathday) },
    { label: t('facts.birthplace'), value: person.place_of_birth },
  ].filter((fact) => fact.value)

  return (
    <div className={styles.hero}>
      <div className={styles.photo}>
        <PersonPhoto
          path={person.profile_path}
          size="w342"
          alt={t('photo', { name: person.name })}
          iconSize={40}
        />
      </div>

      <div className={styles.info}>
        <div>
          {isKnownDepartment(person.known_for_department) && (
            <p className={styles.kicker}>{t(`department.${person.known_for_department}`)}</p>
          )}
          <h1 className={styles.name}>{person.name}</h1>
        </div>

        {facts.length > 0 && (
          <dl className={styles.facts}>
            {facts.map((fact) => (
              <div key={fact.label}>
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
        )}

        <section className={styles.bio} aria-label={t('biography')}>
          {biography ? (
            <>
              <div className={`${styles.bioText} ${folded ? styles.clamped : ''}`}>
                {paragraphs.map((paragraph, index) => (
                  <p key={index} className={styles.paragraph}>
                    {paragraph}
                  </p>
                ))}
              </div>
              {biography.length > LONG_BIO && (
                <Button
                  variant="ghost"
                  className={styles.toggle}
                  aria-expanded={expanded}
                  onClick={() => setExpanded(!expanded)}
                >
                  {expanded ? t('showLess') : t('showMore')}
                </Button>
              )}
            </>
          ) : (
            <p className={styles.muted}>{t('noBiography', { name: person.name })}</p>
          )}
        </section>
      </div>
    </div>
  )
}
