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

/** The token lives in Vercel env: TMDB_TOKEN, or the VITE_TMDB_TOKEN the project already has. */
export const tmdbToken = (): string | undefined =>
  process.env.TMDB_TOKEN ?? process.env.VITE_TMDB_TOKEN
