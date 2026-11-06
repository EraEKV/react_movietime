import Skeleton from '../Skeleton/Skeleton'
import styles from './ListCard.module.css'

/** Same shape as ListCard while lists load. */
export default function ListCardSkeleton() {
  return (
    <div className={styles.card} aria-hidden="true">
      <Skeleton height={128} radius="xs" />
      <div className={styles.body}>
        <Skeleton width="60%" height={20} />
        <Skeleton width="30%" height={14} />
        <Skeleton width={72} height={24} radius="xs" />
      </div>
    </div>
  )
}
