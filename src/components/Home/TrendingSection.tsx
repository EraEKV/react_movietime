import { useState } from 'react'
import { endpoints, imageUrl } from '../../api/tmdb'
import type { FetchState } from '../../hooks/useFetch'
import { useFetch } from '../../hooks/useFetch'
import type { MovieListItem, Paginated, SeriesListItem } from '../../types/tmdb'
import { getYear } from '../../utils/format'
import ErrorState from '../EmptyState/ErrorState'
import PosterCard from '../PosterCard/PosterCard'
import PosterRow, { PosterRowSkeleton } from '../PosterRow/PosterRow'
import Section from '../Section/Section'
import SegmentedControl from '../SegmentedControl/SegmentedControl'

type Tab = 'series' | 'movies'

interface Item {
  id: number
  title: string
  href: string
  posterPath: string | null
  date: string
  rating: number
  kind: string
}

// TMDB names the same fields differently for series and movies; one shape for the row.
const fromSeries = (s: SeriesListItem): Item => ({
  id: s.id,
  title: s.name,
  href: `/series/${s.id}`,
  posterPath: s.poster_path,
  date: s.first_air_date,
  rating: s.vote_average,
  kind: 'Series',
})

const fromMovie = (m: MovieListItem): Item => ({
  id: m.id,
  title: m.title,
  href: `/movies/${m.id}`,
  posterPath: m.poster_path,
  date: m.release_date,
  rating: m.vote_average,
  kind: 'Movie',
})

interface TrendingSectionProps {
  /** Loaded by HomePage, because the guest hero uses the same response. */
  series: FetchState<Paginated<SeriesListItem>>
}

export default function TrendingSection({ series }: TrendingSectionProps) {
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
      title="Trending this week"
      aside={
        <SegmentedControl
          label="Type"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'series', label: 'Series' },
            { value: 'movies', label: 'Movies' },
          ]}
        />
      }
    >
      {(state.status === 'idle' || state.status === 'loading') && <PosterRowSkeleton />}
      {state.status === 'error' && (
        <ErrorState
          headingLevel="h3"
          title="We couldn’t load trending titles"
          body={state.error.message}
          onRetry={state.reload}
        />
      )}
      {state.status === 'success' && (
        <PosterRow label={`Trending ${tab}`}>
          {items.map((item) => (
            <li key={item.id}>
              <PosterCard
                title={item.title}
                href={item.href}
                posterUrl={imageUrl(item.posterPath, 'w342')}
                year={getYear(item.date)}
                meta={item.kind}
                rating={item.rating}
              />
            </li>
          ))}
        </PosterRow>
      )}
    </Section>
  )
}
