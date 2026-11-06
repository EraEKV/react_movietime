import type { ReactNode } from 'react'
import styles from './SectionHeader.module.css'

interface SectionHeaderProps {
  title: string
  kicker?: string
  /** Right side: a link or a control. */
  action?: ReactNode
  id?: string
}

export default function SectionHeader({ title, kicker, action, id }: SectionHeaderProps) {
  return (
    <div className={styles.header}>
      <div>
        {kicker && <p className={styles.kicker}>{kicker}</p>}
        <h2 className={styles.title} id={id}>
          {title}
        </h2>
      </div>
      {action}
    </div>
  )
}
