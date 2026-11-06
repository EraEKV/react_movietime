import { Outlet } from 'react-router'
import { endpoints, imageUrl } from '../../api/tmdb'
import { useFetch } from '../../hooks/useFetch'
import { useSystemThemeSync } from '../../hooks/useTheme'
import type { Paginated, SeriesListItem } from '../../types/tmdb'
import Logo from '../Logo/Logo'
import Skeleton from '../Skeleton/Skeleton'
import styles from './AuthLayout.module.css'

const MOSAIC_SIZE = 9
const POPULAR = endpoints.discoverSeries({ sortBy: 'popularity.desc', minVotes: 300 })

/** Decorative poster wall for the desktop side panel; hidden from screen readers. */
function PosterMosaic() {
  const { status, data } = useFetch<Paginated<SeriesListItem>>(POPULAR)
  const posters =
    status === 'success'
      ? data.results.filter((s) => s.poster_path).slice(0, MOSAIC_SIZE)
      : Array.from({ length: MOSAIC_SIZE }, () => null)

  return (
    <div className={styles.mosaic} aria-hidden="true">
      {posters.map((series, i) =>
        series ? (
          <img key={series.id} src={imageUrl(series.poster_path) ?? ''} alt="" loading="lazy" />
        ) : (
          <Skeleton key={i} ratio="2 / 3" radius="sm" />
        ),
      )}
    </div>
  )
}

/**
 * Layout route for login, signup and verify-email: a split screen, on mobile only the form.
 * Being a parent route, it stays mounted while the guards and pages inside it change.
 */
export default function AuthLayout() {
  // These pages live outside the main Layout, so they follow the OS theme themselves.
  useSystemThemeSync()

  return (
    <div className={styles.page}>
      <aside className={styles.panel}>
        <Logo />
        <PosterMosaic />
        <p className={styles.pitch}>
          Plan the evenings. Watch together. Never lose your place in a series again.
        </p>
      </aside>

      <main id="main" className={styles.main}>
        <div className={styles.mobileLogo}>
          <Logo />
        </div>
        <div className={styles.content}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
