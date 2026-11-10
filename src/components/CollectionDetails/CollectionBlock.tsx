import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { endpoints } from '../../shared/api/tmdb'
import { useFetch } from '../../shared/hooks/useFetch'
import Button from '../../shared/ui/Button/Button'
import ButtonLink from '../../shared/ui/ButtonLink/ButtonLink'
import Section from '../../shared/ui/Section/Section'
import { useLibraryStatuses } from '../../hooks/useLibraryStatuses'
import type { CollectionDetails, CollectionSummary } from '../../types/tmdb'
import { filmsByDate } from '../../utils/collection'
import PosterRow, { PosterRowSkeleton } from '../PosterRow/PosterRow'
import FilmCard from './FilmCard'
import styles from './CollectionDetails.module.css'

/**
 * "From the same collection" on a movie page: the other films of its franchise in release
 * order, with a link to the whole collection. Only movies belong to collections in TMDB,
 * so series pages never render this. The films come from one extra request; the link works
 * even when that fails.
 */
export default function CollectionBlock({
  collection,
  currentId,
}: {
  collection: CollectionSummary
  currentId: number
}) {
  const { t } = useTranslation('collection')
  const statuses = useLibraryStatuses()
  const { status, data, reload } = useFetch<CollectionDetails>(endpoints.collection(collection.id))

  const others = useMemo(
    () => (data ? filmsByDate(data.parts).filter((film) => film.id !== currentId) : []),
    [data, currentId],
  )

  // A franchise with nothing else in it: the link alone would repeat the page itself.
  if (status === 'success' && others.length === 0) return null

  return (
    <Section
      title={t('block.title')}
      kicker={t('block.partOf', { name: collection.name })}
      aside={
        <ButtonLink to={`/collection/${collection.id}`} variant="ghost">
          {t('block.open')}
        </ButtonLink>
      }
    >
      {status === 'error' ? (
        <div className={styles.blockError} role="alert">
          <span>{t('block.loadError')}</span>
          <Button size="sm" onClick={reload}>
            {t('dialog.retry')}
          </Button>
        </div>
      ) : status === 'success' ? (
        <PosterRow label={t('block.films', { name: collection.name })}>
          {others.map((film) => (
            <li key={film.key}>
              <FilmCard film={film} status={statuses.get(film.key)} />
            </li>
          ))}
        </PosterRow>
      ) : (
        <PosterRowSkeleton count={5} />
      )}
    </Section>
  )
}
