import { useId } from 'react'
import styles from './SelectField.module.css'

/** Labelled, controlled <select>. `options` is a list of { value, label }. */
export default function SelectField({ label, value, options, onChange, disabled = false }) {
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
        onChange={(e) => onChange(e.target.value)}
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
