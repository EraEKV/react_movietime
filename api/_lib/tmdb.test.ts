import { describe, expect, it } from 'vitest'
import { upstreamUrl } from './tmdb'

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
