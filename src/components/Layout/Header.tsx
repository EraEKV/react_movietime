import { Link, NavLink } from 'react-router'
import { useTheme } from '../../hooks/useTheme'
import { buttonClass } from '../Button/variants'
import Icon from '../Icon/Icon'
import IconButton from '../IconButton/IconButton'
import Logo from '../Logo/Logo'
import HeaderSearch from './HeaderSearch'
import styles from './Layout.module.css'
import { MAIN_NAV } from './navigation'

/** Desktop (≥1024): logo, main nav, search, theme. Below: compact bar, nav moves to the TabBar. */
export default function Header() {
  const { theme, toggleTheme } = useTheme()
  const nextTheme = theme === 'dark' ? 'light' : 'dark'

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Logo />

        <nav className={styles.nav} aria-label="Main">
          {MAIN_NAV.map((item) => (
            // NavLink sets aria-current="page" on the active link; CSS styles that attribute.
            <NavLink key={item.to} to={item.to} end={item.end} className={styles.navLink}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.tools}>
          <HeaderSearch />
          <Link
            to="/"
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
