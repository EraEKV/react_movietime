import Skeleton from '../../shared/ui/Skeleton/Skeleton'
import styles from './DetailsSkeleton.module.css'

/** Same shape as the hero and the first section, so nothing jumps when data arrives. */
export default function DetailsSkeleton({ label }: { label: string }) {
  return (
    <div className={styles.page} aria-busy="true" aria-label={label}>
      <Skeleton width={96} height={44} radius="sm" />
      <div className={styles.hero}>
        <div className={styles.poster}>
          <Skeleton ratio="2 / 3" radius="sm" />
        </div>
        <div className={styles.lines}>
          <Skeleton width="30%" height={20} radius="pill" />
          <Skeleton width="60%" height={40} />
          <Skeleton width="40%" height={16} />
          <Skeleton width={180} height={44} radius="sm" />
        </div>
      </div>
      <Skeleton height={320} radius="md" />
    </div>
  )
}
