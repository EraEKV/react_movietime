import Skeleton from '../Skeleton/Skeleton'
import styles from './Library.module.css'

/** Rows in the shape of LibraryItem, shown while the account library loads. */
export default function LibrarySkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className={styles.list} aria-busy="true" aria-label="Loading your library">
      {Array.from({ length: rows }, (_, i) => (
        // Placeholders have no identity, so the index is a fine key.
        <div key={i} className={styles.skeletonRow}>
          <Skeleton width={72} height={108} radius="sm" />
          <div className={styles.skeletonLines}>
            <Skeleton width="40%" height={18} />
            <Skeleton width="25%" height={14} />
            <Skeleton width="60%" height={6} />
          </div>
        </div>
      ))}
    </div>
  )
}
