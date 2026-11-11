// A short technical line shown with "Google sign-in didn't finish", so a phone (where there is
// no console at hand) can report what the redirect ran with. It names no account and no token.

export interface RedirectFacts {
  host: string
  authDomain: string | undefined
  standalone: boolean
  /** document.referrer: where the browser came from (Google, our own handler, nothing). */
  referrer: string
  userAgent: string
}

const hostOf = (url: string): string => {
  try {
    return new URL(url).host || '-'
  } catch {
    return '-'
  }
}

/** iOS / Android / desktop, plus "in-app" for the web views of social and chat apps. */
export function deviceKind(userAgent: string): string {
  const os = /iPhone|iPad|iPod/i.test(userAgent)
    ? 'iOS'
    : /Android/i.test(userAgent)
      ? 'Android'
      : 'desktop'
  const inApp =
    /FBAN|FBAV|Instagram|Line\/|Snapchat|; wv\)|Telegram|TikTok|MiuiBrowser|YaBrowser/i.test(
      userAgent,
    )
  return inApp ? `${os} in-app` : os
}

/** "avleron.com · auth avleron.com · browser · from accounts.google.com · iOS". */
export function describeRedirect(facts: RedirectFacts): string {
  return [
    facts.host,
    `auth ${facts.authDomain ?? '-'}`,
    facts.standalone ? 'app' : 'browser',
    `from ${facts.referrer ? hostOf(facts.referrer) : '-'}`,
    deviceKind(facts.userAgent),
  ].join(' · ')
}
