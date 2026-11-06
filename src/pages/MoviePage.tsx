import { useParams } from 'react-router'
import BackButton from '../components/BackButton/BackButton'
import ButtonLink from '../components/ButtonLink/ButtonLink'
import ErrorState from '../components/EmptyState/ErrorState'
import MovieDetails from '../components/MovieDetails/MovieDetails'

export default function MoviePage() {
  const { id = '' } = useParams()

  // Checked before any request: TMDB ids are positive integers.
  if (!/^\d+$/.test(id)) {
    return (
      <>
        <BackButton />
        <ErrorState
          icon="link"
          title="This link doesn’t point to a movie"
          body={`“${id}” is not a valid movie id. Check the link, or find the movie in the catalog.`}
          secondary={
            <ButtonLink to="/movies" variant="primary" icon="compass">
              Browse movies
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
