import type { WatchStatus } from '../../types/watchlist'
import { cx } from '../../utils/cx'
import { statusLabel } from '../../utils/watchlist'
import type { IconName } from '../Icon/icons'
import Icon from '../Icon/Icon'
import styles from './StatusMarker.module.css'

const STATUS_ICON: Record<WatchStatus, IconName> = {
  plan: 'bookmark',
  watching: 'play',
  completed: 'check',
  dropped: 'x',
}

/** Library status as icon + text: the shape tells it apart, not only the colour. */
export default function StatusMarker({ status }: { status: WatchStatus }) {
  return (
    <span className={cx(styles.marker, styles[status])}>
      <Icon name={STATUS_ICON[status]} size={14} />
      {statusLabel(status)}
    </span>
  )
}
