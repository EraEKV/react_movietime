import Skeleton from './Skeleton'
import styles from './Skeleton.module.css'

export default function PosterSkeleton() {
  return (
    <div className={styles.poster} aria-hidden="true">
      <Skeleton ratio="2 / 3" radius="sm" />
      <Skeleton width="80%" height={14} />
      <Skeleton width="45%" height={12} />
    </div>
  )
}
