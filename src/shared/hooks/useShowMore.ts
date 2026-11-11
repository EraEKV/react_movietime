import { useState } from 'react'
import { useMediaQuery } from './useMediaQuery'

/** How many items a long list shows before "Show all": 5 on phones, 12 elsewhere. */
export const SHOW_PHONE = 5
export const SHOW_DESKTOP = 12

/**
 * Limit for a long list with a Show all / Show less toggle. Lists that are horizontal
 * scrollers (cast, recommendations) don't use it: scrolling already keeps them short.
 */
export function useShowMore<T>(items: T[], phone = SHOW_PHONE, desktop = SHOW_DESKTOP) {
  const [expanded, setExpanded] = useState(false)
  const onPhone = useMediaQuery('(max-width: 767px)')
  const limit = onPhone ? phone : desktop
  const collapsible = items.length > limit
  return {
    visible: expanded || !collapsible ? items : items.slice(0, limit),
    collapsible,
    expanded,
    toggle: () => setExpanded((value) => !value),
  }
}
