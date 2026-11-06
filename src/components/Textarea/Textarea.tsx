import { useId, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { cx } from '../../shared/lib/cx'
import Field from '../Field/Field'
import { hintId } from '../Field/hintId'
import styles from '../Field/Field.module.css'

interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  label: string
  value: string
  onChange: (value: string) => void
  /** Soft limit: typing past it is allowed, the counter and error explain what to trim. */
  maxLength?: number
  hint?: ReactNode
  error?: string | null
  optional?: boolean
}

export default function Textarea({
  label,
  value,
  onChange,
  maxLength,
  hint,
  error,
  optional,
  rows = 4,
  id: idProp,
  ...props
}: TextareaProps) {
  const generatedId = useId()
  const id = idProp ?? generatedId
  const over = maxLength !== undefined && value.length > maxLength

  return (
    <Field
      id={id}
      label={label}
      hint={hint}
      error={error}
      optional={optional}
      counter={
        maxLength !== undefined && (
          <span className={cx(styles.counter, over && styles.counterOver)}>
            {value.length} / {maxLength}
          </span>
        )
      }
    >
      <div className={cx(styles.control, styles.area)}>
        <textarea
          id={id}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(error) || over || undefined}
          aria-describedby={hint || error || maxLength !== undefined ? hintId(id) : undefined}
          {...props}
        />
      </div>
    </Field>
  )
}
