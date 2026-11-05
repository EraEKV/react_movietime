import type { ReactNode } from 'react'
import styles from './PosterCard.module.css'

interface PosterGridProps {
  children: ReactNode
  label?: string
  busy?: boolean
}

/** Responsive poster grid; children are <li> items. */
export default function PosterGrid({ children, label, busy }: PosterGridProps) {
  return (
    <ul className={styles.grid} aria-label={label} aria-busy={busy || undefined}>
      {children}
    </ul>
  )
}
