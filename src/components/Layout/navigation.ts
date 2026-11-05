import type { IconName } from '../Icon/icons'

export interface NavItem {
  to: string
  label: string
  icon: IconName
  /** Match only the exact path (for "/"). */
  end?: boolean
}

// Only routes that exist today. Phase "routing" adds Home, Movies, Lists, Planner, Profile.
export const MAIN_NAV: NavItem[] = [
  { to: '/', label: 'Series', icon: 'tv', end: true },
  { to: '/watchlist', label: 'Library', icon: 'bookmark' },
]

export const TAB_BAR_NAV: NavItem[] = [
  { to: '/', label: 'Discover', icon: 'compass', end: true },
  { to: '/watchlist', label: 'Library', icon: 'bookmark' },
]
