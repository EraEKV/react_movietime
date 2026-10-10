import { useParams } from 'react-router'
import BackButton from '../components/BackButton/BackButton.jsx'
import SeriesDetails from '../components/SeriesDetails/SeriesDetails.jsx'
import StatusMessage from '../components/StatusMessage/StatusMessage.jsx'

export default function SeriesPage() {
  const { id } = useParams()

  if (!/^\d+$/.test(id)) {
    return (
      <>
        <BackButton />
        <StatusMessage tone="error" title="Invalid series link">
          “{id}” is not a valid series id.
        </StatusMessage>
      </>
    )
  }

  // Going from /series/1396 to /series/60059 renders the same component at the same
  // place in the tree, so React would keep its state (e.g. a playing trailer).
  // A key tied to the id makes React treat each series as a new component and reset it.
  return <SeriesDetails key={id} seriesId={id} />
}
