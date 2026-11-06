import type { IconName } from '../Icon/icons'

export interface NavItem {
  to: string
  /** Key in the common dictionary; the components translate it, so it follows the language. */
  label: `nav.${'home' | 'movies' | 'series' | 'library' | 'lists' | 'planner' | 'discover' | 'profile'}`
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
  { to: '/', label: 'nav.home', icon: 'home' },
  { to: '/movies', label: 'nav.movies', icon: 'film' },
  { to: '/series', label: 'nav.series', icon: 'tv' },
  { to: '/library', label: 'nav.library', icon: 'bookmark' },
  { to: '/lists', label: 'nav.lists', icon: 'list' },
  { to: '/planner', label: 'nav.planner', icon: 'calendar' },
]

// Bottom tab bar (< 1024px): five sections, so related routes share one tab.
export const TAB_BAR_NAV: NavItem[] = [
  { to: '/', label: 'nav.home', icon: 'home' },
  { to: '/series', label: 'nav.discover', icon: 'compass', alsoActiveOn: ['/movies'] },
  { to: '/planner', label: 'nav.planner', icon: 'calendar' },
  { to: '/library', label: 'nav.library', icon: 'bookmark', alsoActiveOn: ['/lists'] },
  { to: '/profile', label: 'nav.profile', icon: 'user', alsoActiveOn: ['/dashboard'] },
]
