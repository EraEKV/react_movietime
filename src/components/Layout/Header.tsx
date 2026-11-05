import { Link, useLocation } from 'react-router'
import { useTheme } from '../../hooks/useTheme'
import { buttonClass } from '../Button/variants'
import Icon from '../Icon/Icon'
import IconButton from '../IconButton/IconButton'
import Logo from '../Logo/Logo'
import HeaderSearch from './HeaderSearch'
import styles from './Layout.module.css'
import { isNavItemActive, MAIN_NAV } from './navigation'

/** Desktop (≥1024): logo, main nav, search, theme. Below: compact bar, nav moves to the TabBar. */
export default function Header() {
  const { pathname } = useLocation()
  const { theme, toggleTheme } = useTheme()
  const nextTheme = theme === 'dark' ? 'light' : 'dark'

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Logo />

        <nav className={styles.nav} aria-label="Main">
          {MAIN_NAV.map((item) => (
            // aria-current="page" marks the current section; CSS styles that attribute.
            <Link
              key={item.to}
              to={item.to}
              aria-current={isNavItemActive(item, pathname) ? 'page' : undefined}
              className={styles.navLink}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className={styles.tools}>
          <HeaderSearch />
          {/* state asks the catalog to focus its search field: one tap to start typing. */}
          <Link
            to="/"
            state={{ focusSearch: true }}
            className={buttonClass('ghost', 'md', { iconOnly: true, className: styles.mobileOnly })}
            aria-label="Search"
          >
            <Icon name="search" size={20} />
          </Link>
          <IconButton
            icon={theme === 'dark' ? 'sun' : 'moon'}
            label={`Switch to ${nextTheme} theme`}
            onClick={toggleTheme}
          />
        </div>
      </div>
    </header>
  )
}
