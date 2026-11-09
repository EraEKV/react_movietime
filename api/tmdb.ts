import { json } from './_lib/firebase.js'
import { proxyTarget, tmdbToken } from './_lib/tmdb.js'

// GET /api/tmdb/<any TMDB v3 path>?<query>, which vercel.json rewrites to
// /api/tmdb?path=<path>&<query>: forwards the request with the server's token.
// Successful answers are cached at Vercel's edge for a few minutes, so the same page opened
// by many people costs TMDB one request.

export async function GET(request: Request): Promise<Response> {
  const token = tmdbToken()
  if (!token) return json({ status_message: 'The TMDB token is not configured.' }, 503)

  const target = proxyTarget(request.url)
  if (!target) return json({ status_message: 'Not a TMDB path.' }, 400)

  let upstream: Response
  try {
    upstream = await fetch(target, {
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
        ? 'public, s-maxage=300, stale-while-revalidate=3600'
        : 'no-store',
    },
  })
}
