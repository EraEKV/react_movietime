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

// Only routes that exist today. Phase "routing" adds Home, Movies, Lists, Planner, Profile.
export const MAIN_NAV: NavItem[] = [
  { to: '/series', label: 'Series', icon: 'tv' },
  { to: '/watchlist', label: 'Library', icon: 'bookmark' },
]

export const TAB_BAR_NAV: NavItem[] = [
  { to: '/series', label: 'Discover', icon: 'compass' },
  { to: '/watchlist', label: 'Library', icon: 'bookmark' },
]
