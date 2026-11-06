import { useTranslation } from 'react-i18next'
import { lazy, Suspense } from 'react'
import { endpoints } from '../api/tmdb'
import ContinueWatching from '../components/Home/ContinueWatching'
import HeatmapTeaser from '../components/Home/HeatmapTeaser'
import HomeHero from '../components/Home/HomeHero'
import TrendingSection from '../components/Home/TrendingSection'
import UpNextSection from '../components/Home/UpNextSection'
import { useAuth } from '../hooks/useAuth'
import { useFetch } from '../hooks/useFetch'
import type { Paginated, SeriesListItem } from '../types/tmdb'
import styles from '../components/Home/Home.module.css'

// Lazy: list cards aren't needed for the first paint, and most visitors have no shared
// lists. Its own Suspense with no fallback, so loading it never blanks the page.
const SharedWithYou = lazy(() => import('../components/Home/SharedWithYou'))

/**
 * Landing page. Guests get the pitch; signed-in users get their evening first.
 * Each section handles its own loading and error state, so one failed request
 * never blanks the whole page.
 */
export default function HomePage() {
  const { t } = useTranslation('home')
  const { user, status } = useAuth()
  // Fetched here, not in TrendingSection: the guest hero needs the same posters,
  // and lifting the request up means one network call for both.
  const trendingSeries = useFetch<Paginated<SeriesListItem>>(endpoints.trending('tv'))

  // While the session is being restored, show neither variant: no hero flash for users.
  const guest = status !== 'loading' && !user

  return (
    <div className={styles.page}>
      <title>{t('pageTitle')}</title>
      {guest ? (
        <HomeHero series={trendingSeries.data?.results ?? null} />
      ) : (
        <>
          {/* The page needs an h1; for users it is visually replaced by the section titles. */}
          <h1 className="sr-only">{t('heading')}</h1>
          {user && <UpNextSection />}
          {user && <ContinueWatching />}
        </>
      )}
      <TrendingSection series={trendingSeries} />
      <HeatmapTeaser />
      {user && (
        <Suspense fallback={null}>
          <SharedWithYou />
        </Suspense>
      )}
    </div>
  )
}
