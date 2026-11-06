import { currentLocale } from '../../shared/i18n'
import { formatDateWith } from '../../shared/i18n/intl'
import { useTranslation } from 'react-i18next'
import { lazy, Suspense } from 'react'
import Section from '../Section/Section'
import SectionLink from '../SectionHeader/SectionLink'
import Skeleton from '../Skeleton/Skeleton'
import styles from './Home.module.css'

// The list (planner hooks, Firestore) is a separate chunk: Home's first paint doesn't wait
// for it, and guests never download it.
const UpNextList = lazy(() => import('./UpNextList'))

const todayLabel = () =>
  formatDateWith(new Date(), { weekday: 'long', month: 'long', day: 'numeric' }, currentLocale())

/** Today's and tomorrow's sessions with "Mark watched", or the way to make a first plan. */
export default function UpNextSection() {
  const { t } = useTranslation('home')
  return (
    <Section
      title={t('upNext.title')}
      kicker={todayLabel()}
      aside={<SectionLink to="/planner">{t('upNext.open')}</SectionLink>}
    >
      <Suspense
        fallback={
          <div className={styles.upNext} aria-busy="true" aria-label={t('upNext.loading')}>
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
