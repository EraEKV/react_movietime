import { useWatchlist } from '../../hooks/useWatchlist'
import { statusLabel } from '../../utils/watchlist'
import ButtonLink from '../ButtonLink/ButtonLink'

export default function WatchlistButton({ seriesId }: { seriesId: number }) {
  const { entries } = useWatchlist()
  const entry = entries.find((e) => e.seriesId === seriesId)

  if (entry) {
    return (
      <ButtonLink to={`/library/${entry.id}/edit`} icon="check">
        In library · {statusLabel(entry.status)}
      </ButtonLink>
    )
  }

  return (
    <ButtonLink to={`/library/new?series=${seriesId}`} variant="primary" icon="plus">
      Add to library
    </ButtonLink>
  )
}
