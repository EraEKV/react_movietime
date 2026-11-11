import { describe, expect, it, vi } from 'vitest'
import { cachedTmdb, type EdgeCache } from './cache'

/** A Map-backed stand-in for caches.default (keys are URLs, like the real one). */
function memoryCache(): EdgeCache & { store: Map<string, Response> } {
  const store = new Map<string, Response>()
  return {
    store,
    match: (request) => Promise.resolve(store.get(request.url)?.clone()),
    put: (request, response) => {
      store.set(request.url, response)
      return Promise.resolve()
    },
  }
}

const context = () => {
  const pending: Promise<unknown>[] = []
  return {
    waitUntil: (p: Promise<unknown>) => void pending.push(p),
    settle: () => Promise.all(pending),
  }
}

const origin = 'https://avleron.com'
const ok = () =>
  new Response('{"id":550}', {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=600' },
  })

describe('cachedTmdb', () => {
  it('asks TMDB once, then answers the same request from the cache', async () => {
    const cache = memoryCache()
    const ctx = context()
    const run = vi.fn(async () => ok())
    const request = () => new Request(`${origin}/api/tmdb/movie/550?language=en-US`)

    const first = await cachedTmdb(request(), ctx, run, cache)
    await ctx.settle()
    const second = await cachedTmdb(request(), ctx, run, cache)

    expect(run).toHaveBeenCalledTimes(1)
    expect(first.headers.get('X-Cache')).toBe('MISS')
    expect(second.headers.get('X-Cache')).toBe('HIT')
    expect(await second.json()).toEqual({ id: 550 })
  })

  it('stores for the edge lifetime but tells the browser its own', async () => {
    const cache = memoryCache()
    const ctx = context()
    const request = new Request(`${origin}/api/tmdb/genre/tv/list?language=en-US`)
    await cachedTmdb(request, ctx, async () => ok(), cache)
    await ctx.settle()

    const stored = [...cache.store.values()][0]
    expect(stored?.headers.get('Cache-Control')).toBe('public, max-age=604800')
    const hit = await cachedTmdb(request, ctx, async () => ok(), cache)
    expect(hit.headers.get('Cache-Control')).toContain('max-age=86400')
  })

  it('treats spellings of one request as one entry', async () => {
    const cache = memoryCache()
    const ctx = context()
    const run = vi.fn(async () => ok())
    await cachedTmdb(new Request(`${origin}/api/tmdb/movie/550?language=en-US`), ctx, run, cache)
    await ctx.settle()
    await cachedTmdb(
      new Request(`${origin}/api/tmdb/movie/550?junk=1&language=en-US&other=2`),
      ctx,
      run,
      cache,
    )
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('never stores errors', async () => {
    const cache = memoryCache()
    const ctx = context()
    const run = vi.fn(async () => new Response('{}', { status: 404 }))
    const request = () => new Request(`${origin}/api/tmdb/movie/1?language=en-US`)
    await cachedTmdb(request(), ctx, run, cache)
    await ctx.settle()
    await cachedTmdb(request(), ctx, run, cache)
    expect(cache.store.size).toBe(0)
    expect(run).toHaveBeenCalledTimes(2)
  })

  it('passes anything that is not a proxied GET straight through', async () => {
    const cache = memoryCache()
    const ctx = context()
    const run = vi.fn(async () => ok())
    await cachedTmdb(new Request(`${origin}/api/tmdb/configuration`), ctx, run, cache)
    await cachedTmdb(
      new Request(`${origin}/api/tmdb/movie/550`, { method: 'POST' }),
      ctx,
      run,
      cache,
    )
    await ctx.settle()
    expect(run).toHaveBeenCalledTimes(2)
    expect(cache.store.size).toBe(0)
  })

  it('still answers when the cache is missing or broken', async () => {
    const ctx = context()
    const request = () => new Request(`${origin}/api/tmdb/movie/550?language=en-US`)
    expect((await cachedTmdb(request(), ctx, async () => ok(), undefined)).status).toBe(200)

    const broken: EdgeCache = {
      match: () => Promise.reject(new Error('down')),
      put: () => Promise.reject(new Error('down')),
    }
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect((await cachedTmdb(request(), ctx, async () => ok(), broken)).status).toBe(200)
    await ctx.settle()
    quiet.mockRestore()
  })
})
