import { useId } from 'react'
import type { Option } from '../../types/common'
import styles from './SelectField.module.css'

/** Labelled, controlled <select>. `options` is a list of { value, label }. */
interface SelectFieldProps<V extends string> {
  label: string
  value: V
  options: Option<V>[]
  onChange: (value: V) => void
  disabled?: boolean
}

export default function SelectField<V extends string>({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: SelectFieldProps<V>) {
  const id = useId()

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <select
        id={id}
        className={styles.select}
        value={value}
        // Options come from `options`, so the selected value is always one of V.
        onChange={(e) => onChange(e.target.value as V)}
        disabled={disabled}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
