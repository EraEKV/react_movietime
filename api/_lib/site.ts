// The address people are sent to from emails and calendar events. It is one setting, the
// SITE_URL environment variable ("https://example.com", no trailing slash needed): change it
// there when the app moves to another domain or host. Without it, the origin of the request
// is used, which is right for localhost and for a deployment that is only reached by one
// address.

export function siteOrigin(request: Request): string {
  const configured = process.env.SITE_URL?.trim().replace(/\/+$/, '')
  if (configured) return configured
  return new URL(request.url).origin
}
