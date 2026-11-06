import { useTranslation } from 'react-i18next'
import { lazy, Suspense } from 'react'
import { Link, useLocation } from 'react-router'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'
import UserMenu from '../auth/UserMenu'
import { buttonClass } from '../Button/variants'
import Icon from '../Icon/Icon'
import IconButton from '../IconButton/IconButton'
import Logo from '../Logo/Logo'
import HeaderSearch from './HeaderSearch'
import OfflinePill from '../Pwa/OfflinePill'
import LanguageMenu from './LanguageMenu'
import styles from './Layout.module.css'
import { isNavItemActive, MAIN_NAV } from './navigation'

// Separate chunk: the planner hooks and Firestore aren't part of the first paint.
const TonightChip = lazy(() => import('./TonightChip'))

/** Desktop (≥1024): logo, main nav, search, theme, account. Below: compact bar, nav moves to the TabBar. */
export default function Header() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const { theme, toggleTheme } = useTheme()
  const nextTheme = theme === 'dark' ? 'light' : 'dark'
  const { user } = useAuth()

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
              {t(item.label)}
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
          {/* state asks the catalog to focus its search field: one tap to start typing. */}
          <Link
            to="/series"
            state={{ focusSearch: true }}
            className={buttonClass('ghost', 'md', { iconOnly: true, className: styles.mobileOnly })}
            aria-label={t('header.search')}
          >
            <Icon name="search" size={20} />
          </Link>
          <IconButton
            icon={theme === 'dark' ? 'sun' : 'moon'}
            label={t(nextTheme === 'dark' ? 'header.toDark' : 'header.toLight')}
            onClick={toggleTheme}
          />
          <LanguageMenu />
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
