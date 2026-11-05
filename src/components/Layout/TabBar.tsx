import { NavLink } from 'react-router'
import Icon from '../Icon/Icon'
import styles from './Layout.module.css'
import { TAB_BAR_NAV } from './navigation'

/** Bottom navigation on phones and tablets (< 1024px). */
export default function TabBar() {
  return (
    <nav className={styles.tabBar} aria-label="Main">
      {TAB_BAR_NAV.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end} className={styles.tab}>
          <Icon name={item.icon} size={22} />
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}
