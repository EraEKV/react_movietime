import type { Option } from '../../types/common'
import styles from './StatusTabs.module.css'

/** Segmented filter with a count per option. `tabs`: [{ value, label, count }]. */
interface StatusTabsProps<V extends string> {
  tabs: (Option<V> & { count: number })[]
  value: V
  onChange: (value: V) => void
  label: string
}

export default function StatusTabs<V extends string>({
  tabs,
  value,
  onChange,
  label,
}: StatusTabsProps<V>) {
  return (
    <div className={styles.tabs} role="group" aria-label={label}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          className={styles.tab}
          aria-pressed={tab.value === value}
          onClick={() => onChange(tab.value)}
        >
          {tab.label}
          <span className={styles.count}>{tab.count}</span>
        </button>
      ))}
    </div>
  )
}
