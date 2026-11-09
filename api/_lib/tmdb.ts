// The TMDB proxy: the browser asks our own domain, the server adds the token and asks TMDB.
// That keeps working on networks that block api.themoviedb.org, and the token stays out of
// the client bundle.

export const TMDB_UPSTREAM = 'https://api.themoviedb.org/3'
const PREFIX = '/api/tmdb'

/**
 * `/api/tmdb/movie/550?language=en-US` → the TMDB URL to fetch, or null when the path is not
 * a plain TMDB path. Only letters, digits, `/`, `_` and `-` pass (no `.`, `%`, `@`, `\`),
 * so a request can't escape the /3 prefix or point the server at another host.
 */
export function upstreamUrl(pathname: string, search: string): string | null {
  if (!pathname.startsWith(`${PREFIX}/`)) return null
  const path = pathname.slice(PREFIX.length)
  if (!/^\/[A-Za-z0-9/_-]+$/.test(path) || path.includes('//')) return null
  return `${TMDB_UPSTREAM}${path}${search}`
}

/**
 * The request URL → the TMDB URL. On Vercel the function may see either the rewritten URL
 * (`/api/tmdb?path=discover/movie&page=2`, from vercel.json) or the original one
 * (`/api/tmdb/discover/movie?page=2`), so both are understood: a `path` parameter wins,
 * otherwise the path is read from the pathname.
 */
export function proxyTarget(requestUrl: string): string | null {
  const url = new URL(requestUrl)
  const path = url.searchParams.get('path')
  if (path !== null) {
    url.searchParams.delete('path')
    const query = url.searchParams.toString()
    const fromParam = upstreamUrl(`${PREFIX}/${path}`, query ? `?${query}` : '')
    if (fromParam) return fromParam
  }
  return upstreamUrl(url.pathname, url.search)
}

/** The token lives in Vercel env: TMDB_TOKEN, or the VITE_TMDB_TOKEN the project already has. */
export const tmdbToken = (): string | undefined =>
  process.env.TMDB_TOKEN ?? process.env.VITE_TMDB_TOKEN
