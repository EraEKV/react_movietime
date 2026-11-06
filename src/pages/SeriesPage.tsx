import { useParams } from 'react-router'
import BackButton from '../components/BackButton/BackButton'
import SeriesDetails from '../components/SeriesDetails/SeriesDetails'
import ButtonLink from '../components/ButtonLink/ButtonLink'
import ErrorState from '../components/EmptyState/ErrorState'

export default function SeriesPage() {
  const { id = '' } = useParams()

  if (!/^\d+$/.test(id)) {
    return (
      <>
        <BackButton />
        <ErrorState
          icon="link"
          title="This link doesn’t point to a series"
          body={`“${id}” is not a valid series id. Check the link, or find the series in the catalog.`}
          secondary={
            <ButtonLink to="/series" variant="primary" icon="compass">
              Browse series
            </ButtonLink>
          }
        />
      </>
    )
  }

  // Going from /series/1396 to /series/60059 renders the same component at the same
  // place in the tree, so React would keep its state (e.g. a playing trailer).
  // A key tied to the id makes React treat each series as a new component and reset it.
  return <SeriesDetails key={id} seriesId={id} />
}
