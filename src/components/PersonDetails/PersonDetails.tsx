import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiError, endpoints } from '../../shared/api/tmdb'
import { useFetch } from '../../shared/hooks/useFetch'
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus'
import BackButton from '../../shared/ui/BackButton/BackButton'
import ButtonLink from '../../shared/ui/ButtonLink/ButtonLink'
import ErrorState from '../../shared/ui/EmptyState/ErrorState'
import { useLibraryStatuses } from '../../hooks/useLibraryStatuses'
import type { PersonDetails as PersonData } from '../../types/tmdb'
import { buildFilmography, directedFilms, isoDay, knownFor } from '../../utils/person'
import Filmography from './Filmography'
import KnownFor from './KnownFor'
import PersonHero from './PersonHero'
import PersonSkeleton from './PersonSkeleton'
import styles from './PersonDetails.module.css'

export default function PersonDetails({ personId }: { personId: string }) {
  const { t } = useTranslation('person')
  const online = useOnlineStatus()
  const { status, data: person, error, reload } = useFetch<PersonData>(endpoints.person(personId))
  const statuses = useLibraryStatuses()
  const today = isoDay(new Date())
  const works = useMemo(
    () =>
      person ? buildFilmography(person.combined_credits.cast, person.combined_credits.crew) : [],
    [person],
  )
  const directed = useMemo(() => directedFilms(works, today).length, [works, today])
  const topWorks = useMemo(
    () => (person ? knownFor(works, person.known_for_department, today) : []),
    [person, works, today],
  )

  if (status === 'idle' || status === 'loading') {
    return <PersonSkeleton label={t('loading')} />
  }

  if (status === 'error') {
    const notFound = error instanceof ApiError && error.status === 404
    const offline = !online && !notFound
    return (
      <>
        <BackButton />
        <ErrorState
          icon={notFound ? 'user' : offline ? 'wifi-off' : 'alert'}
          title={t(notFound ? 'notFound' : offline ? 'offlineTitle' : 'error')}
          body={notFound ? t('notFoundBody') : offline ? t('offlineBody') : error.message}
          onRetry={notFound ? undefined : reload}
          secondary={
            <ButtonLink to="/movies" icon="compass">
              {t('browse')}
            </ButtonLink>
          }
        />
      </>
    )
  }

  return (
    <article>
      {/* React 19 hoists <title> into <head>. */}
      <title>{t('pageTitle', { name: person.name })}</title>
      <BackButton />
      <div className={styles.page}>
        <PersonHero person={person} marathonFilms={directed} />
        <KnownFor works={topWorks} statuses={statuses} />
        <Filmography name={person.name} works={works} today={today} statuses={statuses} />
      </div>
    </article>
  )
}
