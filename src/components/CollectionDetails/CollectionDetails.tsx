import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiError, endpoints, imageUrl } from '../../shared/api/tmdb'
import { useFetch } from '../../shared/hooks/useFetch'
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus'
import BackButton from '../../shared/ui/BackButton/BackButton'
import ButtonLink from '../../shared/ui/ButtonLink/ButtonLink'
import ErrorState from '../../shared/ui/EmptyState/ErrorState'
import Icon from '../../shared/ui/Icon/Icon'
import ProgressBar from '../../shared/ui/ProgressBar/ProgressBar'
import { useLibraryStatuses } from '../../hooks/useLibraryStatuses'
import type { CollectionDetails as CollectionData } from '../../types/tmdb'
import { filmsByDate, splitFilms, yearSpan } from '../../utils/collection'
import { isoDay, seenProgress } from '../../utils/person'
import DetailsSkeleton from '../DetailsSkeleton/DetailsSkeleton'
import CollectionActions from './CollectionActions'
import CollectionFilms from './CollectionFilms'
import styles from './CollectionDetails.module.css'

export default function CollectionDetails({ collectionId }: { collectionId: string }) {
  const { t } = useTranslation(['collection', 'common'])
  const online = useOnlineStatus()
  const {
    status,
    data: collection,
    error,
    reload,
  } = useFetch<CollectionData>(endpoints.collection(collectionId))
  const statuses = useLibraryStatuses()

  const today = isoDay(new Date())
  const films = useMemo(() => (collection ? filmsByDate(collection.parts) : []), [collection])
  const { released, upcoming } = useMemo(() => splitFilms(films, today), [films, today])

  if (status === 'idle' || status === 'loading') {
    return <DetailsSkeleton label={t('loading')} />
  }

  if (status === 'error') {
    const notFound = error instanceof ApiError && error.status === 404
    const offline = !online && !notFound
    return (
      <>
        <BackButton />
        <ErrorState
          icon={notFound ? 'film' : offline ? 'wifi-off' : 'alert'}
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

  const backdrop = imageUrl(collection.backdrop_path, 'w1280')
  const poster = imageUrl(collection.poster_path, 'w342')
  const progress = seenProgress(released, statuses)
  const years = yearSpan(films)
  const meta = [t('common:count.movies', { count: films.length }), years]
    .filter(Boolean)
    .join(' · ')

  return (
    <article>
      {/* React 19 hoists <title> into <head>. */}
      <title>{t('pageTitle', { name: collection.name })}</title>
      <BackButton />
      <div className={styles.page}>
        <div className={styles.hero}>
          {backdrop && (
            <div className={styles.backdrop} style={{ backgroundImage: `url(${backdrop})` }} />
          )}
          <div className={styles.content}>
            <div className={styles.poster}>
              {poster ? (
                <img src={poster} alt={t('cover', { name: collection.name })} />
              ) : (
                <div className={styles.posterFallback}>
                  <Icon name="film" size={32} />
                </div>
              )}
            </div>
            <div className={styles.info}>
              <p className={styles.kicker}>{t('kicker')}</p>
              <h1 className={styles.title}>{collection.name}</h1>
              <p className={styles.meta}>{meta}</p>
              <div className={styles.actions}>
                <CollectionActions
                  collectionId={collection.id}
                  name={collection.name}
                  films={films}
                  releasedCount={released.length}
                />
              </div>
            </div>
          </div>
        </div>

        <div className={styles.about}>
          <p className={collection.overview.trim() ? styles.overview : styles.muted}>
            {collection.overview.trim() || t('noOverview')}
          </p>
          <div className={styles.progress}>
            {progress.total > 0 ? (
              <>
                <div className={styles.progressText}>
                  <strong>
                    {t('progress.seen', { seen: progress.seen, total: progress.total })}
                  </strong>
                  {progress.planned > 0 && (
                    <span className={styles.muted}>
                      {t('progress.planned', { count: progress.planned })}
                    </span>
                  )}
                </div>
                <ProgressBar value={progress.seen / progress.total} label={t('progress.label')} />
              </>
            ) : (
              <p className={styles.muted}>{t('progress.none')}</p>
            )}
          </div>
        </div>

        <CollectionFilms
          name={collection.name}
          released={released}
          upcoming={upcoming}
          statuses={statuses}
        />
      </div>
    </article>
  )
}
