import { useId, type ReactNode } from 'react'
import type { Option } from '../../types/common'
import Field from '../Field/Field'
import { hintId } from '../Field/hintId'
import styles from '../Field/Field.module.css'
import Select from '../Select/Select'

/** Labelled, controlled select: a listbox popup on desktop, a bottom sheet on phones. */
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
        <Select
          id={id}
          label={label}
          value={value}
          options={options}
          onChange={onChange}
          disabled={disabled}
          aria-describedby={hint || error ? hintId(id) : undefined}
        />
      </div>
    </Field>
  )
}
