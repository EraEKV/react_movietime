import type { ReactNode } from 'react'
import { cx } from '../../shared/lib/cx'
import Icon from '../Icon/Icon'
import { hintId } from './hintId'
import styles from './Field.module.css'

export interface FieldProps {
  /** id of the input inside; the hint/error gets `${id}-hint` for aria-describedby. */
  id: string
  label: ReactNode
  hint?: ReactNode
  error?: string | null
  optional?: boolean
  disabled?: boolean
  /** Right side of the hint row, e.g. a character counter. */
  counter?: ReactNode
  hideLabel?: boolean
  className?: string
  children: ReactNode
}

/** Label + control + hint/error. The error is text with an icon, never colour alone. */
export default function Field({
  id,
  label,
  hint,
  error,
  optional,
  disabled,
  counter,
  hideLabel,
  className,
  children,
}: FieldProps) {
  const showHint = Boolean(error || hint || counter)
  return (
    <div
      className={cx(styles.field, error && styles.invalid, disabled && styles.disabled, className)}
    >
      <label htmlFor={id} className={hideLabel ? 'sr-only' : styles.label}>
        {label}
        {optional && <span className={styles.optional}> · optional</span>}
      </label>
      {children}
      {showHint && (
        <div className={cx(styles.hint, error && styles.error)} id={hintId(id)}>
          {error ? (
            <>
              <Icon name="alert" size={16} />
              <span className={styles.hintText} role="alert">
                {error}
              </span>
            </>
          ) : (
            <span className={styles.hintText}>{hint}</span>
          )}
          {counter}
        </div>
      )}
    </div>
  )
}
