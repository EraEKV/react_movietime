import { describe, expect, it } from 'vitest'
import { parseTmdbRequest, proxyTarget } from './tmdb'

const BASE = 'https://avleron.com'
describe('parseTmdbRequest', () => {
  it('maps a proxy path and its query onto the TMDB v3 API', () => {
    expect(parseTmdbRequest('/api/tmdb/discover/movie', '?language=en-US&page=2')?.upstream).toBe(
      'https://api.themoviedb.org/3/discover/movie?language=en-US&page=2',
    )
    expect(parseTmdbRequest('/api/tmdb/discover/tv', '')?.upstream).toBe(
      'https://api.themoviedb.org/3/discover/tv',
    )
  })

  it('gives every spelling of one request the same key', () => {
    const a = parseTmdbRequest('/api/tmdb/discover/movie', '?page=2&language=ru-RU')
    const b = parseTmdbRequest('/api/tmdb/discover/movie', '?language=ru-RU&page=2&junk=1&x=2')
    expect(a?.key).toBe('/discover/movie?language=ru-RU&page=2')
    expect(b?.key).toBe(a?.key)
    expect(b?.upstream).toBe(a?.upstream)
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
    // Valid TMDB paths the app never calls.
    '/api/tmdb/configuration',
    '/api/tmdb/account',
    '/api/tmdb/movie/550/images',
    '/api/tmdb/movie/popular',
    '/api/tmdb/authentication/token/new',
    '/api/tmdb/movie/1234567890',
    '/api/tmdb/trending/movie/day',
  ])('rejects the path %s', (pathname) => {
    expect(parseTmdbRequest(pathname, '')).toBeNull()
  })

  it.each([
    ['/api/tmdb/search/movie', '?page=0'],
    ['/api/tmdb/search/movie', '?page=501'],
    ['/api/tmdb/search/movie', '?page=1&page=2'],
    ['/api/tmdb/search/movie', '?page=abc'],
    ['/api/tmdb/search/movie', '?language=xx_yy'],
    ['/api/tmdb/search/movie', '?language=en-US%0d%0a'],
    ['/api/tmdb/search/movie', `?query=${'a'.repeat(101)}`],
    ['/api/tmdb/search/movie', '?query='],
    ['/api/tmdb/discover/movie', '?primary_release_date.lte=yesterday'],
    ['/api/tmdb/movie/550', '?append_to_response=images'],
    ['/api/tmdb/movie/550', '?append_to_response=credits,credits'],
    [
      '/api/tmdb/tv/1399',
      `?append_to_response=${Array.from({ length: 21 }, (_, i) => `season/${i}`).join(',')}`,
    ],
  ])('rejects %s%s', (pathname, search) => {
    expect(parseTmdbRequest(pathname, search)).toBeNull()
  })

  it('drops parameters the app never sends instead of passing them on', () => {
    const result = parseTmdbRequest(
      '/api/tmdb/movie/550',
      '?language=en-US&api_key=1&sort_by=a&page=7',
    )
    expect(result?.upstream).toBe('https://api.themoviedb.org/3/movie/550?language=en-US')
  })

  it('caches stable data longer than moving data', () => {
    const genres = parseTmdbRequest('/api/tmdb/genre/tv/list', '')
    const trending = parseTmdbRequest('/api/tmdb/trending/tv/week', '')
    expect(genres?.edgeSeconds).toBeGreaterThan(trending?.edgeSeconds ?? 0)
    expect(trending?.browserSeconds).toBeLessThanOrEqual(trending?.edgeSeconds ?? 0)
  })
})

describe('proxyTarget', () => {
  it('reads the path and query from a request URL', () => {
    expect(proxyTarget(`${BASE}/api/tmdb/configuration`)).toBeNull()
    expect(proxyTarget(`${BASE}/api/tmdb/person/287?language=ru-RU`)?.key).toBe(
      '/person/287?language=ru-RU',
    )
  })
})
