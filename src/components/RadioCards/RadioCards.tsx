import { useId } from 'react'
import type { IconName } from '../Icon/icons'
import Icon from '../Icon/Icon'
import styles from './RadioCards.module.css'

export interface RadioCardOption<V extends string> {
  value: V
  label: string
  icon?: IconName
  description?: string
}

interface RadioCardsProps<V extends string> {
  legend: string
  options: RadioCardOption<V>[]
  value: V
  onChange: (value: V) => void
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
}: RadioCardsProps<V>) {
  const name = useId()
  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>{legend}</legend>
      {options.map((option) => (
        <label key={option.value} className={styles.card}>
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={option.value === value}
            onChange={() => onChange(option.value)}
          />
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
