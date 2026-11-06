import type { ReactNode } from 'react'
import styles from './ListCard.module.css'

/** Responsive grid of list cards; children are <li> items. */
export default function ListGrid({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <ul className={styles.grid} aria-label={label}>
      {children}
    </ul>
  )
}
