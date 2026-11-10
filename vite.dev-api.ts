import { existsSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { resolve } from 'node:path'
import { loadEnv, type Plugin } from 'vite'

// `vite` alone only serves the front end, so every call to a function in api/ answered 404
// on localhost (welcome and invite emails, push, the calendar feed). In development this
// plugin runs those same handlers, the way Vercel does: `api/<name>.ts` exports GET, POST…
// taking a Request and returning a Response. Files starting with "_" are helpers, and
// /api/tmdb stays with the dev proxy in vite.config.ts.

const METHODS_WITHOUT_BODY = new Set(['GET', 'HEAD'])

/** Same mapping as vercel.json: /api/calendar/<file> goes to api/ics with ?file=<file>. */
export function route(url: URL): { name: string; url: URL } | null {
  const calendar = /^\/api\/calendar\/([^/]+)$/.exec(url.pathname)
  if (calendar) {
    const rewritten = new URL(url)
    rewritten.pathname = '/api/ics'
    rewritten.searchParams.set('file', calendar[1] ?? '')
    return { name: 'ics', url: rewritten }
  }
  const match = /^\/api\/([A-Za-z0-9-]+(?:\/[A-Za-z0-9-]+)*)$/.exec(url.pathname)
  const name = match?.[1]
  if (!name || name === 'tmdb' || name.split('/').some((part) => part.startsWith('_'))) return null
  return { name, url }
}

async function readBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(Buffer.from(chunk as Uint8Array))
  return Buffer.concat(chunks)
}

async function send(res: ServerResponse, response: Response) {
  res.statusCode = response.status
  response.headers.forEach((value, key) => res.setHeader(key, value))
  res.end(Buffer.from(await response.arrayBuffer()))
}

export default function devApi(mode: string): Plugin {
  return {
    name: 'movietime-dev-api',
    apply: 'serve',
    configureServer(server) {
      // The functions read process.env like on Vercel; the server-only keys (no VITE_
      // prefix) come from .env.local, and anything already exported in the shell wins.
      for (const [key, value] of Object.entries(loadEnv(mode, process.cwd(), ''))) {
        process.env[key] ??= value
      }

      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
        const target = url.pathname.startsWith('/api/') ? route(url) : null
        const file = target && resolve(server.config.root, 'api', `${target.name}.ts`)
        if (!target || !file || !existsSync(file)) return next()

        try {
          const module = (await server.ssrLoadModule(`/api/${target.name}.ts`)) as Record<
            string,
            unknown
          >
          const method = (req.method ?? 'GET').toUpperCase()
          const handler = module[method]
          if (typeof handler !== 'function') {
            return void (await send(res, new Response('Method not allowed', { status: 405 })))
          }
          const body = METHODS_WITHOUT_BODY.has(method) ? undefined : await readBody(req)
          const request = new Request(target.url, {
            method,
            headers: req.headers as Record<string, string>,
            body: body && body.length > 0 ? new Uint8Array(body) : undefined,
          })
          await send(res, (await handler(request)) as Response)
        } catch (error) {
          server.ssrFixStacktrace(error as Error)
          console.error(`[dev-api] ${req.method} ${url.pathname} failed`, error)
          await send(res, Response.json({ error: 'dev-api-failed' }, { status: 500 }))
        }
      })
    },
  }
}
