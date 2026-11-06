import { NavLink, Outlet } from 'react-router'
import styles from './ProfileLayout.module.css'

const LINKS = [
  // `end`: "Profile" is active only on /profile itself, not on /profile/settings.
  { to: '/profile', label: 'Profile', end: true },
  { to: '/profile/settings', label: 'Settings', end: false },
]

/** Nested layout for /profile/*: a sub-navigation above the child page. */
export default function ProfileLayout() {
  return (
    <div className={styles.layout}>
      <nav className={styles.nav} aria-label="Account">
        {LINKS.map((link) => (
          // NavLink sets aria-current="page" on the active link; CSS styles that attribute.
          <NavLink key={link.to} to={link.to} end={link.end} className={styles.link}>
            {link.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  )
}
