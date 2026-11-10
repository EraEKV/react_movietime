// The address people are sent to from emails and calendar events. Requests that arrive on
// the default *.vercel.app address (the old demo link, preview deployments) still produce
// links to the main domain; a custom domain or localhost keeps its own origin.

export const SITE_URL = 'https://avleron.com'

export function siteOrigin(request: Request): string {
  const { origin, hostname } = new URL(request.url)
  return hostname.endsWith('.vercel.app') ? SITE_URL : origin
}
