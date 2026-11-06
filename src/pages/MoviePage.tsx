import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'
import BackButton from '../components/BackButton/BackButton'
import ButtonLink from '../components/ButtonLink/ButtonLink'
import ErrorState from '../components/EmptyState/ErrorState'
import MovieDetails from '../components/MovieDetails/MovieDetails'

export default function MoviePage() {
  const { t } = useTranslation('catalog')
  const { id = '' } = useParams()

  // Checked before any request: TMDB ids are positive integers.
  if (!/^\d+$/.test(id)) {
    return (
      <>
        <BackButton />
        <ErrorState
          icon="link"
          title={t('details.badMovieLink')}
          body={t('details.badMovieId', { id })}
          secondary={
            <ButtonLink to="/movies" variant="primary" icon="compass">
              {t('details.browseMovies')}
            </ButtonLink>
          }
        />
      </>
    )
  }

  // A key tied to the id makes React treat each movie as a new component, so going from
  // one movie to a recommended one resets local state (e.g. a playing trailer).
  return <MovieDetails key={id} movieId={id} />
}
