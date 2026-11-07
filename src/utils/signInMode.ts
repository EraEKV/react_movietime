// Google sign-in opens a popup on desktop and redirects on phones and in an installed app.
// A popup in an installed iPhone app (and often on Android) is blocked or opens inside the
// app; a redirect uses the normal browser flow and comes back to the app.

export interface Environment {
  /** `matchMedia('(display-mode: standalone)')` or iOS `navigator.standalone`. */
  standalone: boolean
  userAgent: string
  maxTouchPoints: number
}

/** Redirect for an installed app and for phones/tablets; popup for desktop browsers. */
export function shouldRedirect({ standalone, userAgent, maxTouchPoints }: Environment): boolean {
  if (standalone) return true
  if (/iPhone|iPad|iPod|Android/i.test(userAgent)) return true
  // iPadOS pretends to be a Mac; a Mac has no touch screen.
  return /Macintosh/.test(userAgent) && maxTouchPoints > 1
}

export function currentEnvironment(): Environment {
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  return { standalone, userAgent: navigator.userAgent, maxTouchPoints: navigator.maxTouchPoints }
}

/**
 * A redirect leaves the page, so the app remembers that one was started. On the way back
 * only then it asks Firebase for the result (otherwise every page load would do it).
 */
const PENDING_KEY = 'movietime.googleRedirect'

export function markRedirectStarted(): void {
  try {
    localStorage.setItem(PENDING_KEY, '1')
  } catch {
    // Storage disabled: the sign-in still completes, the profile is created on the next sign-in.
  }
}

/** Peek: is a redirect sign-in waiting to be finished? */
export function redirectPending(): boolean {
  try {
    return localStorage.getItem(PENDING_KEY) === '1'
  } catch {
    return false
  }
}

/** True once per started redirect. */
export function takeRedirectMark(): boolean {
  try {
    const pending = localStorage.getItem(PENDING_KEY) === '1'
    localStorage.removeItem(PENDING_KEY)
    return pending
  } catch {
    return false
  }
}
