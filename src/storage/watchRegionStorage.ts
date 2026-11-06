// The country the "Where to watch" block shows, saved on this device only (not part of the
// account: it is a viewing habit, not a profile setting, so it needs no rules).
export const WATCH_REGION_KEY = 'movietime.watchRegion.v1'

const REGION = /^[A-Z]{2}$/

export function loadWatchRegion(): string | null {
  try {
    const value = localStorage.getItem(WATCH_REGION_KEY)
    return value && REGION.test(value) ? value : null
  } catch {
    return null
  }
}

export function saveWatchRegion(region: string): void {
  try {
    if (REGION.test(region)) localStorage.setItem(WATCH_REGION_KEY, region)
  } catch {
    // Storage disabled (private mode): the choice still applies until the page closes.
  }
}
