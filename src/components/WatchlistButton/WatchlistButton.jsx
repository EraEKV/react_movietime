import { Link } from 'react-router'
import { useWatchlist } from '../../hooks/useWatchlist.js'
import { statusLabel } from '../../utils/watchlist.js'
import styles from './WatchlistButton.module.css'

export default function WatchlistButton({ seriesId }) {
  const { entries } = useWatchlist()
  const entry = entries.find((e) => e.seriesId === seriesId)

  if (entry) {
    return (
      <Link to={`/watchlist/${entry.id}/edit`} className={`${styles.button} ${styles.added}`}>
        ✓ In watchlist · {statusLabel(entry.status)}
      </Link>
    )
  }

  return (
    <Link to={`/watchlist/new?series=${seriesId}`} className={styles.button}>
      + Add to watchlist
    </Link>
  )
}
