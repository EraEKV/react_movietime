import type { LibraryStatus } from '../../types/library'
import type { IconName } from '../Icon/icons'

/** One icon per library status: markers, menus and radio cards use the same shapes. */
export const STATUS_ICON: Record<LibraryStatus, IconName> = {
  plan: 'bookmark',
  watching: 'play',
  completed: 'check',
  dropped: 'x',
}
