import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import Field from '../Field/Field'
import { hintId } from '../Field/hintId'
import styles from '../Field/Field.module.css'
import type { IconName } from '../Icon/icons'
import Icon from '../Icon/Icon'

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string
  value: string
  onChange: (value: string) => void
  hint?: ReactNode
  error?: string | null
  icon?: IconName
  optional?: boolean
  /** Keeps the label for screen readers only (e.g. a search box with a placeholder). */
  hideLabel?: boolean
  /** Extra element at the right edge of the control. */
  trailing?: ReactNode
}

/**
 * Controlled text input. With type="password" it becomes a password field
 * with a show/hide toggle (aria-pressed tells screen readers its state).
 */
export default function TextField({
  label,
  value,
  onChange,
  hint,
  error,
  icon,
  optional,
  hideLabel,
  trailing,
  type = 'text',
  id: idProp,
  disabled,
  ...inputProps
}: TextFieldProps) {
  const generatedId = useId()
  const id = idProp ?? generatedId
  const [revealed, setRevealed] = useState(false)
  const isPassword = type === 'password'
  const describedBy = error || hint ? hintId(id) : undefined

  return (
    <Field
      id={id}
      label={label}
      hint={hint}
      error={error}
      optional={optional}
      disabled={disabled}
      hideLabel={hideLabel}
    >
      <div className={styles.control}>
        {icon && <Icon name={icon} size={18} className={styles.leading} />}
        <input
          id={id}
          type={isPassword && revealed ? 'text' : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy}
          {...inputProps}
        />
        {isPassword && (
          <button
            type="button"
            className={styles.inlineButton}
            onClick={() => setRevealed((r) => !r)}
            aria-label={revealed ? 'Hide password' : 'Show password'}
            aria-pressed={revealed}
          >
            <Icon name={revealed ? 'eye-off' : 'eye'} size={18} />
          </button>
        )}
        {trailing}
      </div>
    </Field>
  )
}
