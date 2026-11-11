import { useTranslation } from 'react-i18next'

import { ApiError, endpoints } from '../../shared/api/tmdb'
import { useFetch } from '../../shared/hooks/useFetch'
import { seriesCredits } from '../../utils/credits'
import { keyCrew } from '../../utils/person'
import { useGenres } from '../../hooks/useGenres'
import type { SeriesDetails as SeriesDetailsData } from '../../types/tmdb'
import { useTmdbLanguage } from '../../shared/hooks/useTmdbLanguage'
import { fromSeries, overviewOf, pickTrailer, tmdbStatusLabel } from '../../utils/media'
import { formatYearRange } from '../../shared/lib/format'
import { seriesToLibraryMedia } from '../../utils/library'
import { libraryToListMedia } from '../../utils/lists'
import { sortSeasons } from '../../utils/series'
import AddToListButton from '../AddToList/AddToListButton'
import BackButton from '../../shared/ui/BackButton/BackButton'
import ButtonLink from '../../shared/ui/ButtonLink/ButtonLink'
import CastList from '../CastList/CastList'
import CrewList from '../CrewList/CrewList'
import FullCrew from '../FullCrew/FullCrew'
import ErrorState from '../../shared/ui/EmptyState/ErrorState'
import MediaGrid from '../MediaGrid/MediaGrid'
import EpisodeHeatmap from '../EpisodeHeatmap/EpisodeHeatmap'
import SeasonList from '../SeasonList/SeasonList'
import Section from '../../shared/ui/Section/Section'
import TitleHero from '../TitleHero/TitleHero'
import Trailer from '../Trailer/Trailer'
import WhereToWatch from '../WhereToWatch/WhereToWatch'
import LibraryButton from '../LibraryButton/LibraryButton'
import PlanWatchingButton from '../Planner/PlanWatchingButton'
import DetailsSkeleton from '../DetailsSkeleton/DetailsSkeleton'

const MAX_RECOMMENDATIONS = 10

export default function SeriesDetails({ seriesId }: { seriesId: string }) {
  const { t } = useTranslation(['catalog', 'common'])
  const { t: tPerson } = useTranslation('person')
  // One request: details + credits + aggregate credits + videos + recommendations via append_to_response.
  const {
    status,
    data: series,
    error,
    reload,
  } = useFetch<SeriesDetailsData>(endpoints.seriesDetails(seriesId, useTmdbLanguage()))
  const { genresById } = useGenres('tv')

  if (status === 'idle' || status === 'loading') {
    return <DetailsSkeleton label={t('details.loadingSeries')} />
  }

  if (status === 'error') {
    const notFound = error instanceof ApiError && error.status === 404
    return (
      <>
        <BackButton />
        <ErrorState
          icon={notFound ? 'tv' : 'alert'}
          title={t(notFound ? 'details.seriesNotFound' : 'details.seriesError')}
          body={notFound ? t('details.notFoundBody') : error.message}
          onRetry={notFound ? undefined : reload}
          secondary={
            <ButtonLink to="/series" icon="compass">
              {t('details.browseSeries')}
            </ButtonLink>
          }
        />
      </>
    )
  }

  const credits = seriesCredits(series)
  const cast = credits.cast
  const crew = keyCrew([
    ...series.created_by.map((creator) => ({ ...creator, job: 'Creator' })),
    ...credits.crew,
  ])
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
      <title>{t('details.pageTitle', { title: series.name })}</title>

      <TitleHero
        back={<BackButton />}
        title={series.name}
        originalTitle={series.original_name}
        tagline={series.tagline}
        posterPath={series.poster_path}
        backdropPath={series.backdrop_path}
        fallbackIcon="tv"
        genres={series.genres}
        genreTo={(id) => `/series?genre=${id}`}
        rating={series.vote_average}
        votes={series.vote_count}
        meta={[
          formatYearRange(series.first_air_date, series.last_air_date, series.in_production),
          series.number_of_seasons > 0 &&
            t('common:count.seasons', { count: series.number_of_seasons }),
          series.number_of_episodes > 0 &&
            t('common:count.episodes', { count: series.number_of_episodes }),
          tmdbStatusLabel(series.status),
        ]}
        overview={overviewOf(series)}
        facts={[
          { label: t('details.createdBy'), value: series.created_by.map((p) => p.name).join(', ') },
          { label: t('details.network'), value: series.networks.map((n) => n.name).join(', ') },
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
        <Section title={t('details.episodeRatings')}>
          <EpisodeHeatmap seriesId={seriesId} seasonNumbers={regularSeasons} />
        </Section>
      )}

      {seasons.length > 0 && (
        <Section title={t('details.seasons')}>
          <SeasonList seasons={seasons} />
        </Section>
      )}

      <Section title={t('watch.title')}>
        <WhereToWatch providers={series['watch/providers']} />
      </Section>

      {trailer && (
        <Section title={t('details.trailer')}>
          <Trailer video={trailer} title={series.name} />
        </Section>
      )}

      {crew.length > 0 && (
        <Section title={tPerson('crewLabel')}>
          <CrewList crew={crew} />
          <FullCrew crew={credits.crew} />
        </Section>
      )}

      {cast.length > 0 && (
        <Section title={t('details.cast')}>
          <CastList cast={cast} />
        </Section>
      )}

      {recommendations.length > 0 && (
        <Section title={t('details.recommended')}>
          <MediaGrid
            items={recommendations}
            genresById={genresById}
            label={t('details.recommendations')}
            layout="row"
          />
        </Section>
      )}
    </article>
  )
}
