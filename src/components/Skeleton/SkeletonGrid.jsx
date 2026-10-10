import gridStyles from '../SeriesGrid/SeriesGrid.module.css'
import styles from './SkeletonGrid.module.css'

export default function SkeletonGrid({ count = 20 }) {
  return (
    <ul className={gridStyles.grid} aria-busy="true" aria-label="Loading series">
      {Array.from({ length: count }, (_, i) => (
        // Placeholders have no identity of their own, so the index is a fine key here.
        <li key={i} className={styles.card}>
          <div className={styles.poster} />
          <div className={styles.line} />
          <div className={`${styles.line} ${styles.short}`} />
        </li>
      ))}
    </ul>
  )
}
