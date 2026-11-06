import { useTranslation } from 'react-i18next'
import { NavLink, Outlet } from 'react-router'
import styles from './ProfileLayout.module.css'

const LINKS: { to: string; label: 'common:nav.profile' | 'common:nav.settings'; end: boolean }[] = [
  // `end`: "Profile" is active only on /profile itself, not on /profile/settings.
  { to: '/profile', label: 'common:nav.profile', end: true },
  { to: '/profile/settings', label: 'common:nav.settings', end: false },
]

/** Nested layout for /profile/*: a sub-navigation above the child page. */
export default function ProfileLayout() {
  const { t } = useTranslation(['profile', 'common'])
  return (
    <div className={styles.layout}>
      <nav className={styles.nav} aria-label={t('accountNav')}>
        {LINKS.map((link) => (
          // NavLink sets aria-current="page" on the active link; CSS styles that attribute.
          <NavLink key={link.to} to={link.to} end={link.end} className={styles.link}>
            {t(link.label)}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  )
}
