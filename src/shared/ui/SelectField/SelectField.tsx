import { useId, type ReactNode } from 'react'
import type { Option } from '../../types/common'
import Field from '../Field/Field'
import { hintId } from '../Field/hintId'
import styles from '../Field/Field.module.css'
import Icon from '../Icon/Icon'

/** Labelled, controlled native <select> (native = proper mobile pickers and a11y for free). */
interface SelectFieldProps<V extends string> {
  label: string
  value: V
  options: Option<V>[]
  onChange: (value: V) => void
  disabled?: boolean
  hint?: ReactNode
  error?: string | null
  hideLabel?: boolean
  className?: string
}

export default function SelectField<V extends string>({
  label,
  value,
  options,
  onChange,
  disabled = false,
  hint,
  error,
  hideLabel,
  className,
}: SelectFieldProps<V>) {
  const id = useId()

  function handleChange(raw: string) {
    // Map back to the typed option instead of casting the DOM string.
    const option = options.find((o) => o.value === raw)
    if (option) onChange(option.value)
  }

  return (
    <Field
      id={id}
      label={label}
      hint={hint}
      error={error}
      disabled={disabled}
      hideLabel={hideLabel}
      className={className}
    >
      <div className={styles.control}>
        <select
          id={id}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          disabled={disabled}
          aria-describedby={hint || error ? hintId(id) : undefined}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Icon name="chevron-down" size={18} className={styles.chevron} />
      </div>
    </Field>
  )
}
