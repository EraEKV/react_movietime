import type { KeyboardEvent } from 'react'
import { focusItem, nextIndexForKey } from '../../lib/rovingFocus'
import type { IconName } from '../Icon/icons'
import Icon from '../Icon/Icon'
import styles from './SegmentedControl.module.css'

export interface SegmentOption<V extends string> {
  value: V
  label: string
  icon?: IconName
  /** For icon-only segments. */
  hideLabel?: boolean
}

interface SegmentedControlProps<V extends string> {
  options: SegmentOption<V>[]
  value: V
  onChange: (value: V) => void
  label: string
}

/** Switches a filter or presentation in place (Movies/Series, grid/list). A radio group. */
export default function SegmentedControl<V extends string>({
  options,
  value,
  onChange,
  label,
}: SegmentedControlProps<V>) {
  const selectedIndex = options.findIndex((o) => o.value === value)

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const next = nextIndexForKey(event, selectedIndex, options.length)
    const option = next === null ? undefined : options[next]
    if (next === null || !option) return
    onChange(option.value)
    focusItem(event, 'radio', next)
  }

  return (
    <div className={styles.group} role="radiogroup" aria-label={label} onKeyDown={handleKeyDown}>
      {options.map((option) => {
        const checked = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            className={styles.option}
            aria-checked={checked}
            aria-label={option.hideLabel ? option.label : undefined}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(option.value)}
          >
            {option.icon && <Icon name={option.icon} size={16} />}
            {!option.hideLabel && option.label}
          </button>
        )
      })}
    </div>
  )
}
