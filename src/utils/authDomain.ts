// Google sign-in on phones and in the installed app uses a redirect. It only survives the trip
// when `authDomain` is the app's own domain: otherwise browsers block the storage shared with
// *.firebaseapp.com and the result never arrives. The Worker proxies /__/auth/* from the app's
// own domain (worker/index.ts), so on the production domain that domain is the right value.
//
// The build variable stays the answer everywhere else (localhost, previews, workers.dev):
// the proxy works there too, but only the production domain has its redirect URI registered
// with Google.

const OWN_DOMAINS: ReadonlySet<string> = new Set(['avleron.com'])

/** `authDomain` for the page at `where`: its own host on a proxied domain, else the configured one. */
export function resolveAuthDomain(
  configured: string | undefined,
  where: Pick<Location, 'hostname' | 'host'> | undefined,
): string | undefined {
  return where && OWN_DOMAINS.has(where.hostname) ? where.host : configured
}
