import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'
import PosterSkeleton from '../Skeleton/PosterSkeleton'
import styles from './PosterRow.module.css'

interface PosterRowProps {
  /** <li> items, usually PosterCards. */
  children: ReactNode
  label: string
}

/** One horizontal, swipeable row of posters (Home sections). Scroll snaps to each poster. */
export default function PosterRow({ children, label }: PosterRowProps) {
  return (
    <ul className={styles.row} aria-label={label}>
      {children}
    </ul>
  )
}

export function PosterRowSkeleton({ count = 8 }: { count?: number }) {
  const { t } = useTranslation()
  return (
    <div className={styles.row} role="status" aria-label={t('states.loading')}>
      {Array.from({ length: count }, (_, i) => (
        <PosterSkeleton key={i} />
      ))}
    </div>
  )
}
