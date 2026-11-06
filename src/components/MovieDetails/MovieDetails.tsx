import { useTranslation } from 'react-i18next'
import { ApiError, endpoints } from '../../api/tmdb'
import { useFetch } from '../../hooks/useFetch'
import { useGenres } from '../../hooks/useGenres'
import type { CrewMember, MovieDetails as MovieDetailsData } from '../../types/tmdb'
import { formatDate, formatMoney, formatRuntime, getYear } from '../../utils/format'
import { movieToLibraryMedia } from '../../utils/library'
import { libraryToListMedia } from '../../utils/lists'
import { useTmdbLanguage } from '../../hooks/useTmdbLanguage'
import { languageName } from '../../utils/filters'
import { fromMovie, overviewOf, pickTrailer, tmdbStatusLabel } from '../../utils/media'
import AddToListButton from '../AddToList/AddToListButton'
import BackButton from '../BackButton/BackButton'
import ButtonLink from '../ButtonLink/ButtonLink'
import CastList from '../CastList/CastList'
import DetailsSkeleton from '../DetailsSkeleton/DetailsSkeleton'
import ErrorState from '../EmptyState/ErrorState'
import FactTiles from '../FactTiles/FactTiles'
import LibraryButton from '../LibraryButton/LibraryButton'
import MediaGrid from '../MediaGrid/MediaGrid'
import Section from '../Section/Section'
import TitleHero from '../TitleHero/TitleHero'
import Trailer from '../Trailer/Trailer'

const MAX_CAST = 12
const MAX_RECOMMENDATIONS = 10

/** Some movies have two directors (the Wachowskis), so join every "Director" credit. */
function directorsOf(crew: CrewMember[]): string | null {
  const names = crew.filter((person) => person.job === 'Director').map((person) => person.name)
  return names.length > 0 ? [...new Set(names)].join(', ') : null
}

export default function MovieDetails({ movieId }: { movieId: string }) {
  const { t } = useTranslation('catalog')
  // One request: details + credits + videos + recommendations via append_to_response.
  const {
    status,
    data: movie,
    error,
    reload,
  } = useFetch<MovieDetailsData>(endpoints.movieDetails(movieId, useTmdbLanguage()))
  const { genresById } = useGenres('movie')

  if (status === 'idle' || status === 'loading') {
    return <DetailsSkeleton label={t('details.loadingMovie')} />
  }

  if (status === 'error') {
    const notFound = error instanceof ApiError && error.status === 404
    return (
      <>
        <BackButton />
        <ErrorState
          icon={notFound ? 'film' : 'alert'}
          title={t(notFound ? 'details.movieNotFound' : 'details.movieError')}
          body={notFound ? t('details.notFoundBody') : error.message}
          onRetry={notFound ? undefined : reload}
          secondary={
            <ButtonLink to="/movies" icon="compass">
              {t('details.browseMovies')}
            </ButtonLink>
          }
        />
      </>
    )
  }

  const cast = movie.credits.cast.slice(0, MAX_CAST)
  const trailer = pickTrailer(movie.videos.results)
  const recommendations = movie.recommendations.results.slice(0, MAX_RECOMMENDATIONS).map(fromMovie)
  const countries = movie.production_countries.map((c) => c.name).join(', ')

  const movieMedia = movieToLibraryMedia(movie)

  return (
    <article>
      {/* React 19 hoists <title> into <head> — no document.title side effect needed. */}
      <title>{t('details.pageTitle', { title: movie.title })}</title>

      <BackButton />
      <TitleHero
        title={movie.title}
        originalTitle={movie.original_title}
        tagline={movie.tagline}
        posterPath={movie.poster_path}
        backdropPath={movie.backdrop_path}
        fallbackIcon="film"
        genres={movie.genres}
        rating={movie.vote_average}
        votes={movie.vote_count}
        meta={[
          getYear(movie.release_date),
          formatRuntime(movie.runtime),
          // "Released" is the normal case; only unusual statuses are worth a mention.
          movie.status !== 'Released' && tmdbStatusLabel(movie.status),
        ]}
        overview={overviewOf(movie)}
        facts={[
          { label: t('details.releaseDate'), value: formatDate(movie.release_date) ?? '' },
          {
            label: t('details.originalLanguage'),
            value: movie.original_language ? languageName(movie.original_language) : '',
          },
          { label: t('details.country'), value: countries },
        ].filter((fact) => fact.value)}
        actions={
          <>
            <LibraryButton media={movieMedia} />
            <AddToListButton media={libraryToListMedia(movieMedia)} />
          </>
        }
      />

      <FactTiles
        label={t('details.keyFacts')}
        facts={[
          { label: t('details.director'), value: directorsOf(movie.credits.crew) },
          { label: t('details.budget'), value: formatMoney(movie.budget) },
          { label: t('details.revenue'), value: formatMoney(movie.revenue) },
          { label: t('details.runtime'), value: formatRuntime(movie.runtime) },
        ]}
      />

      {trailer && (
        <Section title={t('details.trailer')}>
          <Trailer video={trailer} title={movie.title} />
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
