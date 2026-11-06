import { useTranslation } from 'react-i18next'
import { cx } from '../../lib/cx'
import Icon from '../Icon/Icon'
import styles from './Chip.module.css'

/** An active filter with a remove button ("Drama ×"). */
export default function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  const { t } = useTranslation()
  return (
    <span className={cx(styles.chip, styles.filter)}>
      {label}
      <button
        type="button"
        className={styles.remove}
        onClick={onRemove}
        aria-label={t('ui.removeFilter', { label })}
      >
        <Icon name="x" size={14} />
      </button>
    </span>
  )
}
