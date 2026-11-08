import { useTranslation } from 'react-i18next'
import { lazy, Suspense, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'
import UserMenu from '../auth/UserMenu'
import { buttonClass } from '../../shared/ui/Button/variants'
import Icon from '../../shared/ui/Icon/Icon'
import IconButton from '../../shared/ui/IconButton/IconButton'
import Logo from '../../shared/ui/Logo/Logo'
import HeaderSearch, { HeaderSearchOverlay } from './HeaderSearch'
import OfflinePill from '../Pwa/OfflinePill'
import LanguageMenu from './LanguageMenu'
import styles from './Layout.module.css'
import { isNavItemActive, MAIN_NAV } from './navigation'

// Separate chunk: the planner hooks and Firestore aren't part of the first paint.
const TonightChip = lazy(() => import('./TonightChip'))
const NotificationBell = lazy(() => import('../Notifications/NotificationBell'))

/** From 768px: logo, main nav (icons only below 1024), search, theme, account. Below: compact bar, nav moves to the TabBar. */
export default function Header() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const { theme, toggleTheme } = useTheme()
  const nextTheme = theme === 'dark' ? 'light' : 'dark'
  const { user } = useAuth()
  const [searchOpen, setSearchOpen] = useState(false)
  const searchButton = useRef<HTMLButtonElement>(null)

  function closeSearch() {
    setSearchOpen(false)
    searchButton.current?.focus()
  }

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Logo />

        <nav className={styles.nav} aria-label={t('nav.main')}>
          {MAIN_NAV.map((item) => (
            // aria-current="page" marks the current section; CSS styles that attribute.
            <Link
              key={item.to}
              to={item.to}
              aria-current={isNavItemActive(item, pathname) ? 'page' : undefined}
              className={styles.navLink}
            >
              <Icon name={item.icon} size={20} className={styles.navIcon} />
              <span className={styles.navLabel}>{t(item.label)}</span>
            </Link>
          ))}
        </nav>

        <div className={styles.tools}>
          <OfflinePill />
          {user && (
            <Suspense fallback={null}>
              <TonightChip />
            </Suspense>
          )}
          <HeaderSearch />
          {/* Below 1180px: opens the search over the header (the inline field needs the room). */}
          <button
            ref={searchButton}
            type="button"
            className={buttonClass('ghost', 'md', { iconOnly: true, className: styles.mobileOnly })}
            aria-label={t('header.search')}
            aria-expanded={searchOpen}
            onClick={() => setSearchOpen(true)}
          >
            <Icon name="search" size={20} />
          </button>
          <IconButton
            icon={theme === 'dark' ? 'sun' : 'moon'}
            label={t(nextTheme === 'dark' ? 'header.toDark' : 'header.toLight')}
            onClick={toggleTheme}
          />
          <LanguageMenu />
          {/* Unverified emails get nothing: the rules answer them with permission-denied. */}
          {user?.emailVerified && (
            <Suspense fallback={null}>
              <NotificationBell />
            </Suspense>
          )}
          <UserMenu />
        </div>
      </div>
      {searchOpen && <HeaderSearchOverlay onClose={closeSearch} />}
    </header>
  )
}
