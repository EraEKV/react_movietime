import { useId, type ReactNode } from 'react'
import SectionHeader from '../SectionHeader/SectionHeader'
import styles from './Section.module.css'

interface SectionProps {
  title: string
  kicker?: string
  aside?: ReactNode
  children: ReactNode
}

/** A titled page section; the heading names the landmark via aria-labelledby. */
export default function Section({ title, kicker, aside, children }: SectionProps) {
  const headingId = useId()
  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <SectionHeader id={headingId} title={title} kicker={kicker} action={aside} />
      {children}
    </section>
  )
}
