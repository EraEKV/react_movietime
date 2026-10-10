import styles from './StatusTabs.module.css'

/** Segmented filter with a count per option. `tabs`: [{ value, label, count }]. */
export default function StatusTabs({ tabs, value, onChange, label }) {
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
