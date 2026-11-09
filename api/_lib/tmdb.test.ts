import { describe, expect, it } from 'vitest'
import { proxyTarget, upstreamUrl } from './tmdb'

describe('upstreamUrl', () => {
  it('maps a proxy path and its query onto the TMDB v3 API', () => {
    expect(upstreamUrl('/api/tmdb/movie/550', '?language=en-US&page=2')).toBe(
      'https://api.themoviedb.org/3/movie/550?language=en-US&page=2',
    )
    expect(upstreamUrl('/api/tmdb/discover/tv', '')).toBe(
      'https://api.themoviedb.org/3/discover/tv',
    )
  })

  it.each([
    '/api/tmdb',
    '/api/tmdb/',
    '/api/tmdb/../movie',
    '/api/tmdb/movie/%2e%2e/x',
    '/api/tmdb//evil.com',
    '/api/tmdb/@evil.com/x',
    '/api/tmdb/movie/550.json',
    '/api/other/movie/550',
  ])('rejects %s', (pathname) => {
    expect(upstreamUrl(pathname, '')).toBeNull()
  })
})

describe('proxyTarget', () => {
  const base = 'https://www.avleron.com/api/tmdb'

  it('rebuilds the TMDB URL from the rewritten request', () => {
    expect(proxyTarget(`${base}?path=discover/movie&page=2&sort_by=popularity.desc`)).toBe(
      'https://api.themoviedb.org/3/discover/movie?page=2&sort_by=popularity.desc',
    )
    expect(proxyTarget(`${base}?path=movie/550`)).toBe('https://api.themoviedb.org/3/movie/550')
  })

  it('reads the path from the URL when the rewrite parameter is absent', () => {
    expect(proxyTarget(`${base}/discover/movie?page=2&language=en-US`)).toBe(
      'https://api.themoviedb.org/3/discover/movie?page=2&language=en-US',
    )
    expect(proxyTarget(`${base}/configuration`)).toBe('https://api.themoviedb.org/3/configuration')
  })

  it.each(['', '?path=', '?path=../movie', '?path=//evil.com', '?path=movie/550.json'])(
    'rejects %s',
    (query) => {
      expect(proxyTarget(`${base}${query}`)).toBeNull()
    },
  )
})
