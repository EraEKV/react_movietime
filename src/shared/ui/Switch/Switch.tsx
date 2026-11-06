import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'
import styles from './Switch.module.css'

interface SwitchProps {
  label: ReactNode
  description?: ReactNode
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
}

/**
 * An on/off setting that applies at once (share link, notifications). A native checkbox
 * with role="switch": screen readers say "on/off" instead of "checked", Space toggles it.
 * Use Checkbox when the choice is submitted with a form.
 */
export default function Switch({
  label,
  description,
  checked,
  onChange,
  disabled,
  className,
}: SwitchProps) {
  return (
    <label className={cx(styles.switch, disabled && styles.disabled, className)}>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className={styles.track} aria-hidden="true" />
      <span className={styles.text}>
        <span className={styles.label}>{label}</span>
        {description && <span className={styles.description}>{description}</span>}
      </span>
    </label>
  )
}
