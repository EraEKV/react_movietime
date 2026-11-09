import SkeletonGrid from '../PosterCard/SkeletonGrid'
import Skeleton from '../../shared/ui/Skeleton/Skeleton'
import styles from './PersonDetails.module.css'

/** Same shape as the hero and the first rows of the filmography. */
export default function PersonSkeleton({ label }: { label: string }) {
  return (
    <div className={styles.page} aria-busy="true" aria-label={label}>
      <Skeleton width={96} height={44} radius="sm" />
      <div className={styles.hero}>
        <div className={styles.photo}>
          <Skeleton ratio="2 / 3" radius="md" />
        </div>
        <div className={styles.info}>
          <Skeleton width="25%" height={14} />
          <Skeleton width="55%" height={40} />
          <Skeleton width="45%" height={16} />
          <Skeleton height={96} radius="md" />
        </div>
      </div>
      <SkeletonGrid count={10} />
    </div>
  )
}
