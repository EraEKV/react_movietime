import { useId, type CSSProperties, type ReactNode } from 'react'
import type { IconName } from '../Icon/icons'
import Icon from '../Icon/Icon'
import styles from './RadioCards.module.css'

export interface RadioCardOption<V extends string> {
  value: V
  label: string
  icon?: IconName
  description?: string
  /** A picture above the label (theme mini-previews); the card stacks vertically. */
  preview?: ReactNode
}

interface RadioCardsProps<V extends string> {
  legend: string
  options: RadioCardOption<V>[]
  value: V
  onChange: (value: V) => void
  /** Fixed column count; by default 2 on phones and 4 from tablets. */
  columns?: number
}

/**
 * Big tappable choices built on real radio inputs: arrow keys, one Tab stop and
 * screen reader support come from the browser. The input is visually hidden, the
 * label is the card.
 */
export default function RadioCards<V extends string>({
  legend,
  options,
  value,
  onChange,
  columns,
}: RadioCardsProps<V>) {
  const name = useId()
  const style = columns ? ({ '--columns': columns } as CSSProperties) : undefined
  return (
    <fieldset className={styles.group} style={style} data-columns={columns ? '' : undefined}>
      <legend className={styles.legend}>{legend}</legend>
      {options.map((option) => (
        <label
          key={option.value}
          className={styles.card}
          data-stacked={option.preview ? '' : undefined}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={option.value === value}
            onChange={() => onChange(option.value)}
          />
          {option.preview}
          {option.icon && <Icon name={option.icon} size={20} className={styles.icon} />}
          <span>
            <span className={styles.label}>{option.label}</span>
            {option.description && <span className={styles.description}>{option.description}</span>}
          </span>
        </label>
      ))}
    </fieldset>
  )
}
