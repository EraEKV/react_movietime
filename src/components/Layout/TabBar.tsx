import { Link, useLocation } from 'react-router'
import Icon from '../Icon/Icon'
import styles from './Layout.module.css'
import { isNavItemActive, TAB_BAR_NAV } from './navigation'

/** Bottom navigation on phones and tablets (< 1024px). */
export default function TabBar() {
  const { pathname } = useLocation()
  return (
    <nav className={styles.tabBar} aria-label="Main">
      {TAB_BAR_NAV.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          aria-current={isNavItemActive(item, pathname) ? 'page' : undefined}
          className={styles.tab}
        >
          <Icon name={item.icon} size={22} />
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
