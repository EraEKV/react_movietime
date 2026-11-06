import { ApiError, endpoints } from '../../api/tmdb'
import { useFetch } from '../../hooks/useFetch'
import { useGenres } from '../../hooks/useGenres'
import type { SeriesDetails as SeriesDetailsData } from '../../types/tmdb'
import { fromSeries, pickTrailer } from '../../utils/media'
import { formatYearRange, pluralize } from '../../utils/format'
import { seriesToLibraryMedia } from '../../utils/library'
import { libraryToListMedia } from '../../utils/lists'
import { sortSeasons } from '../../utils/series'
import AddToListButton from '../AddToList/AddToListButton'
import BackButton from '../BackButton/BackButton'
import ButtonLink from '../ButtonLink/ButtonLink'
import CastList from '../CastList/CastList'
import ErrorState from '../EmptyState/ErrorState'
import MediaGrid from '../MediaGrid/MediaGrid'
import EpisodeHeatmap from '../EpisodeHeatmap/EpisodeHeatmap'
import SeasonList from '../SeasonList/SeasonList'
import Section from '../Section/Section'
import TitleHero from '../TitleHero/TitleHero'
import Trailer from '../Trailer/Trailer'
import LibraryButton from '../LibraryButton/LibraryButton'
import PlanWatchingButton from '../Planner/PlanWatchingButton'
import DetailsSkeleton from '../DetailsSkeleton/DetailsSkeleton'

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
  const { genresById } = useGenres('tv')

  if (status === 'idle' || status === 'loading') return <DetailsSkeleton label="Loading series" />

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
  const recommendations = series.recommendations.results
    .slice(0, MAX_RECOMMENDATIONS)
    .map(fromSeries)

  const seriesMedia = seriesToLibraryMedia(series)

  return (
    <article>
      {/* React 19 hoists <title> into <head> — no document.title side effect needed. */}
      <title>{`${series.name} · Movietime`}</title>

      <BackButton />
      <TitleHero
        title={series.name}
        originalTitle={series.original_name}
        tagline={series.tagline}
        posterPath={series.poster_path}
        backdropPath={series.backdrop_path}
        fallbackIcon="tv"
        genres={series.genres}
        rating={series.vote_average}
        votes={series.vote_count}
        meta={[
          formatYearRange(series.first_air_date, series.last_air_date, series.in_production),
          series.number_of_seasons > 0 && pluralize(series.number_of_seasons, 'season'),
          series.number_of_episodes > 0 && pluralize(series.number_of_episodes, 'episode'),
          series.status,
        ]}
        overview={series.overview}
        facts={[
          { label: 'Created by', value: series.created_by.map((p) => p.name).join(', ') },
          { label: 'Network', value: series.networks.map((n) => n.name).join(', ') },
        ].filter((fact) => fact.value)}
        actions={
          <>
            <LibraryButton media={seriesMedia} />
            <PlanWatchingButton seriesId={series.id} />
            <AddToListButton media={libraryToListMedia(seriesMedia)} />
          </>
        }
      />

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
          <MediaGrid
            items={recommendations}
            genresById={genresById}
            label="Recommendations"
            layout="row"
          />
        </Section>
      )}
    </article>
  )
}
