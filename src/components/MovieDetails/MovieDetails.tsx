import { ApiError, endpoints } from '../../api/tmdb'
import { useFetch } from '../../hooks/useFetch'
import { useGenres } from '../../hooks/useGenres'
import type { CrewMember, MovieDetails as MovieDetailsData } from '../../types/tmdb'
import { formatDate, formatMoney, formatRuntime, getYear } from '../../utils/format'
import { movieToLibraryMedia } from '../../utils/library'
import { fromMovie, pickTrailer } from '../../utils/media'
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

const languageNames = new Intl.DisplayNames(['en'], { type: 'language' })

/** Some movies have two directors (the Wachowskis), so join every "Director" credit. */
function directorsOf(crew: CrewMember[]): string | null {
  const names = crew.filter((person) => person.job === 'Director').map((person) => person.name)
  return names.length > 0 ? [...new Set(names)].join(', ') : null
}

export default function MovieDetails({ movieId }: { movieId: string }) {
  // One request: details + credits + videos + recommendations via append_to_response.
  const {
    status,
    data: movie,
    error,
    reload,
  } = useFetch<MovieDetailsData>(endpoints.movieDetails(movieId))
  const { genresById } = useGenres('movie')

  if (status === 'idle' || status === 'loading') return <DetailsSkeleton label="Loading movie" />

  if (status === 'error') {
    const notFound = error instanceof ApiError && error.status === 404
    return (
      <>
        <BackButton />
        <ErrorState
          icon={notFound ? 'film' : 'alert'}
          title={notFound ? 'Movie not found' : 'We couldn’t load this movie'}
          body={
            notFound ? 'It may have been removed from TMDB, or the link is wrong.' : error.message
          }
          onRetry={notFound ? undefined : reload}
          secondary={
            <ButtonLink to="/movies" icon="compass">
              Browse movies
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

  return (
    <article>
      {/* React 19 hoists <title> into <head> — no document.title side effect needed. */}
      <title>{`${movie.title} · Movietime`}</title>

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
          movie.status !== 'Released' && movie.status,
        ]}
        overview={movie.overview}
        facts={[
          { label: 'Release date', value: formatDate(movie.release_date) ?? '' },
          {
            label: 'Original language',
            value: movie.original_language
              ? (languageNames.of(movie.original_language) ?? movie.original_language)
              : '',
          },
          { label: 'Country', value: countries },
        ].filter((fact) => fact.value)}
        actions={<LibraryButton media={movieToLibraryMedia(movie)} />}
      />

      <FactTiles
        label="Key facts"
        facts={[
          { label: 'Director', value: directorsOf(movie.credits.crew) },
          { label: 'Budget', value: formatMoney(movie.budget) },
          { label: 'Revenue', value: formatMoney(movie.revenue) },
          { label: 'Runtime', value: formatRuntime(movie.runtime) },
        ]}
      />

      {trailer && (
        <Section title="Trailer">
          <Trailer video={trailer} title={movie.title} />
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
