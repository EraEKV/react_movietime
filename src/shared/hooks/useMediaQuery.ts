import { useSyncExternalStore } from 'react'

/**
 * True while the CSS media query matches. useSyncExternalStore is React's way to read an
 * outside value (here the browser's matchMedia) without tearing: it subscribes to changes
 * and re-renders when the answer flips, e.g. when a window is resized past a breakpoint.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
  )
}
