import type { LibraryStatus } from '../../types/library'
import { cx } from '../../shared/lib/cx'
import { statusLabel } from '../../utils/library'
import Icon from '../Icon/Icon'
import styles from './StatusMarker.module.css'
import { STATUS_ICON } from './statusIcons'

/** Library status as icon + text: the shape tells it apart, not only the colour. */
export default function StatusMarker({
  status,
  onPoster = false,
}: {
  status: LibraryStatus
  /** On top of a poster: a solid pill, so it stays readable over any image. */
  onPoster?: boolean
}) {
  return (
    <span className={cx(styles.marker, styles[status], onPoster && styles.onPoster)}>
      <Icon name={STATUS_ICON[status]} size={14} />
      {statusLabel(status)}
    </span>
  )
}
