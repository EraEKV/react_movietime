// Cloudflare's cache for the TMDB proxy: the same title, chart or catalogue page is fetched
// from TMDB once per `edgeSeconds` and then answered from the edge, whoever asks. The key is
// the normalised request (api/_lib/tmdb.ts), so spelling and stray parameters don't matter.
//
// The Cache API works on a custom domain (a zone on Cloudflare). On *.workers.dev it accepts
// the calls and stores nothing, so every request just goes to TMDB, as it did before.

import { browserCacheControl, proxyTarget } from '../api/_lib/tmdb.js'

export interface EdgeCache {
  match(request: Request): Promise<Response | undefined>
  put(request: Request, response: Response): Promise<void>
}

interface Context {
  waitUntil(promise: Promise<unknown>): void
}

const defaultCache = (): EdgeCache | undefined =>
  (globalThis as unknown as { caches?: { default?: EdgeCache } }).caches?.default

export async function cachedTmdb(
  request: Request,
  context: Context,
  run: () => Response | Promise<Response>,
  cache: EdgeCache | undefined = defaultCache(),
): Promise<Response> {
  const target = request.method === 'GET' ? proxyTarget(request.url) : null
  if (!target || !cache) return run()

  const key = new Request(`${new URL(request.url).origin}/api/tmdb${target.key}`)

  try {
    const hit = await cache.match(key)
    if (hit) {
      const answer = new Response(hit.body, hit)
      // The stored copy carries the edge lifetime; the browser gets its own, shorter one.
      answer.headers.set('Cache-Control', browserCacheControl(target))
      answer.headers.set('X-Cache', 'HIT')
      return answer
    }
  } catch (error) {
    console.error('cache read failed', error)
  }

  const response = await run()
  if (!response.ok) return response

  const stored = new Response(response.clone().body, response)
  stored.headers.set('Cache-Control', `public, max-age=${target.edgeSeconds}`)
  context.waitUntil(cache.put(key, stored).catch((error) => console.error('cache write', error)))

  const answer = new Response(response.body, response)
  answer.headers.set('X-Cache', 'MISS')
  return answer
}
