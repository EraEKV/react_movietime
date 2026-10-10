import { useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { useWatchlist } from '../../hooks/useWatchlist.js'
import styles from './Layout.module.css'

export default function Layout() {
  const { pathname } = useLocation()
  const { entries } = useWatchlist()
  const navClass = ({ isActive }) => (isActive ? styles.active : undefined)

  // Syncs the browser's scroll position (an external system) with the route:
  // opening another page starts at the top. Filter/page changes keep the same pathname.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.inner}>
          <NavLink to="/" className={styles.logo}>
            Movie<span>time</span>
          </NavLink>
          <nav className={styles.nav}>
            <NavLink to="/" end className={navClass}>
              Discover
            </NavLink>
            <NavLink to="/watchlist" className={navClass}>
              Watchlist
              {entries.length > 0 && <span className={styles.count}>{entries.length}</span>}
            </NavLink>
          </nav>
        </div>
      </header>

      <main className={styles.main}>
        <Outlet />
      </main>

      <footer className={styles.footer}>
        Data provided by{' '}
        <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer">
          TMDB
        </a>
      </footer>
    </div>
  )
}
