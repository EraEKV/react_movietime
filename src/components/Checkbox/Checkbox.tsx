import type { ReactNode } from 'react'
import { cx } from '../../utils/cx'
import Icon from '../Icon/Icon'
import styles from './Checkbox.module.css'

interface CheckboxProps {
  label: ReactNode
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  /** Keeps the label for screen readers only (the row around it shows the title). */
  hideLabel?: boolean
  className?: string
}

/**
 * A native checkbox (keyboard and screen readers work as usual), visually hidden and drawn
 * as a 20px box inside a 44px-tall label, so the whole label is the touch target.
 */
export default function Checkbox({
  label,
  checked,
  onChange,
  disabled,
  hideLabel,
  className,
}: CheckboxProps) {
  return (
    <label className={cx(styles.check, disabled && styles.disabled, className)}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className={styles.box} aria-hidden="true">
        {checked && <Icon name="check" size={14} />}
      </span>
      <span className={cx(styles.label, hideLabel && 'sr-only')}>{label}</span>
    </label>
  )
}
