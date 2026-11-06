import type { KeyboardEvent } from 'react'
import { focusItem, nextIndexForKey } from '../../shared/lib/rovingFocus'
import type { IconName } from '../Icon/icons'
import Icon from '../Icon/Icon'
import styles from './Tabs.module.css'

export interface TabItem<V extends string> {
  value: V
  label: string
  count?: number
  icon?: IconName
}

interface TabsProps<V extends string> {
  items: TabItem<V>[]
  value: V
  onChange: (value: V) => void
  /** Accessible name of the tab list. */
  label: string
  /** id of the element the tabs control (role="tabpanel"). */
  panelId?: string
}

/** Switches between views of the same data (library statuses). Arrow keys move between tabs. */
export default function Tabs<V extends string>({
  items,
  value,
  onChange,
  label,
  panelId,
}: TabsProps<V>) {
  const selectedIndex = items.findIndex((item) => item.value === value)

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const next = nextIndexForKey(event, selectedIndex, items.length)
    const item = next === null ? undefined : items[next]
    if (next === null || !item) return
    onChange(item.value)
    focusItem(event, 'tab', next)
  }

  return (
    <div className={styles.tabs} role="tablist" aria-label={label} onKeyDown={handleKeyDown}>
      {items.map((item) => {
        const selected = item.value === value
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            className={styles.tab}
            aria-selected={selected}
            aria-controls={panelId}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.value)}
          >
            {item.icon && <Icon name={item.icon} size={18} />}
            {item.label}
            {item.count !== undefined && <span className={styles.count}>{item.count}</span>}
          </button>
        )
      })}
    </div>
  )
}
