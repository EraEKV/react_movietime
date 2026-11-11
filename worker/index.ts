// The Cloudflare Worker in front of the built site (wrangler.jsonc). Static files and the
// single-page fallback are served by Cloudflare itself; only the paths in `run_worker_first`
// reach this code:
//   /api/*   the same handlers as in api/ (they take a Request and return a Response)
//   /__/*    Firebase's auth helper pages, proxied so that sign-in works on our own domain.
// Handlers are imported on demand, so one that cannot start here only fails its own route.

import { cachedTmdb } from './cache.js'

type Handler = (request: Request) => Response | Promise<Response>
type Module = Partial<Record<string, Handler>>

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void
}

interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> }
  FIREBASE_AUTH_HOST: string
}

const routes: Record<string, () => Promise<Module>> = {
  tmdb: () => import('../api/tmdb.js'),
  ics: () => import('../api/ics.js'),
  push: () => import('../api/push.js'),
  'push-notify': () => import('../api/push-notify.js'),
  'send-welcome': () => import('../api/send-welcome.js'),
  'send-invite': () => import('../api/send-invite.js'),
  'send-role-change': () => import('../api/send-role-change.js'),
}

/** /api/calendar/<file> is the calendar feed (api/ics.ts reads the file name from ?file=). */
function route(url: URL): { name: string; url: URL } | null {
  const calendar = /^\/api\/calendar\/([^/]+)$/.exec(url.pathname)
  if (calendar) {
    const rewritten = new URL(url)
    rewritten.pathname = '/api/ics'
    rewritten.searchParams.set('file', calendar[1] ?? '')
    return { name: 'ics', url: rewritten }
  }
  const name =
    /^\/api\/([a-z-]+)$/.exec(url.pathname)?.[1] ?? /^\/api\/(tmdb)\//.exec(url.pathname)?.[1]
  return name && name in routes ? { name, url } : null
}

export default {
  async fetch(request: Request, env: Env, context: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname.startsWith('/__/')) {
      const upstream = new URL(url.pathname + url.search, `https://${env.FIREBASE_AUTH_HOST}`)
      return fetch(new Request(upstream, request))
    }

    const target = route(url)
    if (!target) {
      return url.pathname.startsWith('/api/')
        ? Response.json({ error: 'not-found' }, { status: 404 })
        : env.ASSETS.fetch(request)
    }

    try {
      const handler = (await routes[target.name]?.())?.[request.method]
      if (!handler) return Response.json({ error: 'method-not-allowed' }, { status: 405 })
      const run = () => handler(target.url === url ? request : new Request(target.url, request))
      return target.name === 'tmdb' ? await cachedTmdb(request, context, run) : await run()
    } catch (error) {
      console.error(`/api/${target.name} failed`, error)
      return Response.json({ error: 'server-error' }, { status: 500 })
    }
  },
}
