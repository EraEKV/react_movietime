import { cx } from '../../utils/cx'
import Icon from '../Icon/Icon'
import styles from './Chip.module.css'

/** An active filter with a remove button ("Drama ×"). */
export default function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className={cx(styles.chip, styles.filter)}>
      {label}
      <button
        type="button"
        className={styles.remove}
        onClick={onRemove}
        aria-label={`Remove filter: ${label}`}
      >
        <Icon name="x" size={14} />
      </button>
    </span>
  )
}
