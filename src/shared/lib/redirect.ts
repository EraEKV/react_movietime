/**
 * Where to go after signing in. Only same-site paths are accepted: "/lists/42" is fine,
 * "https://evil.site" or "//evil.site" are not (that would be an open redirect).
 */
export function safeRedirect(target: string | null | undefined, fallback = '/'): string {
  if (!target || !target.startsWith('/') || target.startsWith('//') || target.startsWith('/\\')) {
    return fallback
  }
  return target
}

/** Login URL that brings the user back to `from` afterwards. */
export function loginPath(from: string): string {
  return from === '/' ? '/login' : `/login?redirect=${encodeURIComponent(from)}`
}
