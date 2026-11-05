import type { ReactNode } from 'react'
import styles from './Section.module.css'

interface SectionProps {
  title: string
  aside?: ReactNode
  children: ReactNode
}

export default function Section({ title, aside, children }: SectionProps) {
  return (
    <section className={styles.section}>
      <header className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        {aside}
      </header>
      {children}
    </section>
  )
}
