import { NavLink, Outlet } from 'react-router'
import styles from './Layout.module.css'

export default function Layout() {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.inner}>
          <NavLink to="/" className={styles.logo}>
            Movie<span>time</span>
          </NavLink>
          <nav className={styles.nav}>
            <NavLink
              to="/"
              end
              className={({ isActive }) => (isActive ? styles.active : undefined)}
            >
              Discover
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
