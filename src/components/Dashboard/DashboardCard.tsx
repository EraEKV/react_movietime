import { useId, type ReactNode } from 'react'
import Card from '../Card/Card'
import styles from './Dashboard.module.css'

interface DashboardCardProps {
  title: string
  /** A short hint on the right, e.g. "Bars open the library". */
  hint?: ReactNode
  children: ReactNode
}

/** One chart on the dashboard: a titled card section. */
export default function DashboardCard({ title, hint, children }: DashboardCardProps) {
  // useId, not the title: Russian and Kazakh titles have no Latin letters to build an id from.
  const id = useId()
  return (
    <Card as="section" className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle} id={id}>
          {title}
        </h2>
        {hint && <p className={styles.hint}>{hint}</p>}
      </div>
      <div aria-labelledby={id} role="group">
        {children}
      </div>
    </Card>
  )
}
