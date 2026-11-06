import type { KeyboardEvent } from 'react'

/**
 * Arrow-key navigation for tab lists and radio groups (WAI-ARIA pattern):
 * only the selected item is in the Tab order, arrows move between items.
 * Returns the index to select, or null when the key isn't a navigation key.
 */
export function nextIndexForKey(event: KeyboardEvent, current: number, count: number) {
  const keyMap: Record<string, number> = {
    ArrowRight: current + 1,
    ArrowDown: current + 1,
    ArrowLeft: current - 1,
    ArrowUp: current - 1,
    Home: 0,
    End: count - 1,
  }
  const target = keyMap[event.key]
  if (target === undefined) return null
  event.preventDefault()
  return (target + count) % count // wrap around both ends
}

/** Moves DOM focus to the n-th [role] item inside the event's container. */
export function focusItem(event: KeyboardEvent<HTMLElement>, role: string, index: number) {
  const items = event.currentTarget.querySelectorAll<HTMLElement>(`[role="${role}"]`)
  items[index]?.focus()
}
