import { lazy, Suspense } from 'react'
import Section from '../Section/Section'
import SectionLink from '../SectionHeader/SectionLink'
import Skeleton from '../Skeleton/Skeleton'
import styles from './Home.module.css'

// The list (planner hooks, Firestore) is a separate chunk: Home's first paint doesn't wait
// for it, and guests never download it.
const UpNextList = lazy(() => import('./UpNextList'))

const todayLabel = () =>
  new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(
    new Date(),
  )

/** Today's and tomorrow's sessions with "Mark watched", or the way to make a first plan. */
export default function UpNextSection() {
  return (
    <Section
      title="Up next"
      kicker={todayLabel()}
      aside={<SectionLink to="/planner">Open planner</SectionLink>}
    >
      <Suspense
        fallback={
          <div className={styles.upNext} aria-busy="true" aria-label="Loading your next sessions">
            <Skeleton height={120} radius="md" />
            <Skeleton height={120} radius="md" />
          </div>
        }
      >
        <UpNextList />
      </Suspense>
    </Section>
  )
}
