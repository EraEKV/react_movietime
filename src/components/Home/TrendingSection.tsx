import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { endpoints, imageUrl } from '../../shared/api/tmdb'
import type { FetchState } from '../../hooks/useFetch'
import { useFetch } from '../../hooks/useFetch'
import type { MovieListItem, Paginated, SeriesListItem } from '../../types/tmdb'
import { getYear } from '../../shared/lib/format'
import { fromMovie, fromSeries, mediaHref, mediaKey } from '../../utils/media'
import ErrorState from '../EmptyState/ErrorState'
import PosterCard from '../PosterCard/PosterCard'
import PosterRow, { PosterRowSkeleton } from '../PosterRow/PosterRow'
import Section from '../Section/Section'
import SegmentedControl from '../SegmentedControl/SegmentedControl'

type Tab = 'series' | 'movies'

interface TrendingSectionProps {
  /** Loaded by HomePage, because the guest hero uses the same response. */
  series: FetchState<Paginated<SeriesListItem>>
}

export default function TrendingSection({ series }: TrendingSectionProps) {
  const { t } = useTranslation(['home', 'common'])
  const [tab, setTab] = useState<Tab>('series')
  // null path = no request: movies are fetched only once someone opens that tab.
  const movies = useFetch<Paginated<MovieListItem>>(
    tab === 'movies' ? endpoints.trending('movie') : null,
  )

  const state = tab === 'series' ? series : movies
  // data is null until a request succeeds, so these are empty while loading or on error.
  const items =
    tab === 'series'
      ? (series.data?.results ?? []).map(fromSeries)
      : (movies.data?.results ?? []).map(fromMovie)

  return (
    <Section
      title={t('trending.title')}
      aside={
        <SegmentedControl
          label={t('trending.type')}
          value={tab}
          onChange={setTab}
          options={[
            { value: 'series', label: t('common:nav.series') },
            { value: 'movies', label: t('common:nav.movies') },
          ]}
        />
      }
    >
      {(state.status === 'idle' || state.status === 'loading') && <PosterRowSkeleton />}
      {state.status === 'error' && (
        <ErrorState
          headingLevel="h3"
          title={t('trending.error')}
          body={state.error.message}
          onRetry={state.reload}
        />
      )}
      {state.status === 'success' && (
        <PosterRow label={t(tab === 'movies' ? 'trending.rowMovies' : 'trending.rowSeries')}>
          {items.map((item) => (
            <li key={mediaKey(item.mediaType, item.id)}>
              <PosterCard
                title={item.title}
                href={mediaHref(item.mediaType, item.id)}
                posterUrl={imageUrl(item.posterPath, 'w342')}
                year={getYear(item.date)}
                meta={t(item.mediaType === 'movie' ? 'media.movie' : 'media.series')}
                rating={item.rating}
                placeholderIcon={item.mediaType === 'movie' ? 'film' : 'tv'}
              />
            </li>
          ))}
        </PosterRow>
      )}
    </Section>
  )
}
