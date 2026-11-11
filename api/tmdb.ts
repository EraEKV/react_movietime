import { json } from './_lib/firebase.js'
import { proxyTarget, tmdbToken } from './_lib/tmdb.js'

// GET /api/tmdb/<a TMDB v3 path the app uses>?<query>: forwards the request with the server's
// token (see _lib/tmdb.ts for what is accepted). The Worker (worker/index.ts) keeps the
// answers in Cloudflare's cache, so the same page opened by many people costs TMDB one request.

export async function GET(request: Request): Promise<Response> {
  const token = tmdbToken()
  if (!token) return json({ status_message: 'The TMDB token is not configured.' }, 503)

  const target = proxyTarget(request.url)
  if (!target) return json({ status_message: 'Not a TMDB path.' }, 400)

  let upstream: Response
  try {
    upstream = await fetch(target.upstream, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    })
  } catch {
    return json({ status_message: 'TMDB is not reachable.' }, 502)
  }

  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: {
      'Content-Type': 'application/json',
      // Errors are never cached; a 404 for a new title must not stick.
      'Cache-Control': upstream.ok
        ? `public, max-age=${target.browserSeconds}, stale-while-revalidate=${target.browserSeconds}`
        : 'no-store',
    },
  })
}
