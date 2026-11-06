import type { IconName } from '../Icon/icons'

export interface NavItem {
  to: string
  label: string
  icon: IconName
  /** Other path prefixes that belong to this section (a series page is part of "Series"). */
  alsoActiveOn?: string[]
}

/** "/" matches only itself; other items match their own subtree and the listed prefixes. */
export function isNavItemActive(item: NavItem, pathname: string): boolean {
  const prefixes = [item.to, ...(item.alsoActiveOn ?? [])].filter((p) => p !== '/')
  return (
    pathname === item.to || prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  )
}

// Desktop header (≥ 1024px). Profile and Dashboard live in the avatar menu there.
export const MAIN_NAV: NavItem[] = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/movies', label: 'Movies', icon: 'film' },
  { to: '/series', label: 'Series', icon: 'tv' },
  { to: '/library', label: 'Library', icon: 'bookmark' },
  { to: '/lists', label: 'Lists', icon: 'list' },
  { to: '/planner', label: 'Planner', icon: 'calendar' },
]

// Bottom tab bar (< 1024px): five sections, so related routes share one tab.
export const TAB_BAR_NAV: NavItem[] = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/series', label: 'Discover', icon: 'compass', alsoActiveOn: ['/movies'] },
  { to: '/planner', label: 'Planner', icon: 'calendar' },
  { to: '/library', label: 'Library', icon: 'bookmark', alsoActiveOn: ['/lists'] },
  { to: '/profile', label: 'Profile', icon: 'user', alsoActiveOn: ['/dashboard'] },
]
