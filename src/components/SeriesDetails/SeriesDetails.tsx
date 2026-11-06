import { ApiError, endpoints } from '../../api/tmdb'
import { useFetch } from '../../hooks/useFetch'
import { useGenres } from '../../hooks/useGenres'
import type { SeriesDetails as SeriesDetailsData } from '../../types/tmdb'
import { pickTrailer, sortSeasons } from '../../utils/series'
import BackButton from '../BackButton/BackButton'
import ButtonLink from '../ButtonLink/ButtonLink'
import CastList from '../CastList/CastList'
import ErrorState from '../EmptyState/ErrorState'
import EpisodeHeatmap from '../EpisodeHeatmap/EpisodeHeatmap'
import SeasonList from '../SeasonList/SeasonList'
import Section from '../Section/Section'
import SeriesGrid from '../SeriesGrid/SeriesGrid'
import SeriesHero from '../SeriesHero/SeriesHero'
import Trailer from '../Trailer/Trailer'
import WatchlistButton from '../WatchlistButton/WatchlistButton'
import DetailsSkeleton from './DetailsSkeleton'

const MAX_CAST = 12
const MAX_RECOMMENDATIONS = 10

export default function SeriesDetails({ seriesId }: { seriesId: string }) {
  // One request: details + credits + videos + recommendations via append_to_response.
  const {
    status,
    data: series,
    error,
    reload,
  } = useFetch<SeriesDetailsData>(endpoints.seriesDetails(seriesId))
  const { genresById } = useGenres()

  if (status === 'idle' || status === 'loading') return <DetailsSkeleton />

  if (status === 'error') {
    const notFound = error instanceof ApiError && error.status === 404
    return (
      <>
        <BackButton />
        <ErrorState
          icon={notFound ? 'tv' : 'alert'}
          title={notFound ? 'Series not found' : 'We couldn’t load this series'}
          body={
            notFound ? 'It may have been removed from TMDB, or the link is wrong.' : error.message
          }
          onRetry={notFound ? undefined : reload}
          secondary={
            <ButtonLink to="/series" icon="compass">
              Browse series
            </ButtonLink>
          }
        />
      </>
    )
  }

  const cast = series.credits.cast.slice(0, MAX_CAST)
  const trailer = pickTrailer(series.videos.results)
  const seasons = sortSeasons(series.seasons)
  // Specials (season 0) are left out of the heatmap: they aren't part of the story arc.
  const regularSeasons = seasons.filter((s) => s.season_number > 0).map((s) => s.season_number)
  const recommendations = series.recommendations.results.slice(0, MAX_RECOMMENDATIONS)

  return (
    <article>
      {/* React 19 hoists <title> into <head> — no document.title side effect needed. */}
      <title>{`${series.name} · Movietime`}</title>

      <BackButton />
      <SeriesHero series={series} actions={<WatchlistButton seriesId={series.id} />} />

      {regularSeasons.length > 0 && (
        <Section title="Episode ratings">
          <EpisodeHeatmap seriesId={seriesId} seasonNumbers={regularSeasons} />
        </Section>
      )}

      {seasons.length > 0 && (
        <Section title="Seasons">
          <SeasonList seasons={seasons} />
        </Section>
      )}

      {trailer && (
        <Section title="Trailer">
          <Trailer video={trailer} title={series.name} />
        </Section>
      )}

      {cast.length > 0 && (
        <Section title="Cast">
          <CastList cast={cast} />
        </Section>
      )}

      {recommendations.length > 0 && (
        <Section title="You might also like">
          <SeriesGrid items={recommendations} genresById={genresById} label="Recommendations" />
        </Section>
      )}
    </article>
  )
}
