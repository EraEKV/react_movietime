import { describe, expect, it } from 'vitest'
import { endpoints, withLanguage } from '../../src/shared/api/tmdb'
import {
  catalogPath,
  RATING_OPTIONS,
  RUNTIME_OPTIONS,
  SORT_OPTIONS,
  STATUS_OPTIONS,
  YEAR_OPTIONS,
  type CatalogFilters,
} from '../../src/utils/filters'
import { parseTmdbRequest, proxyTarget } from './tmdb'

const BASE = 'https://avleron.com'
const parse = (path: string, language = 'en-US') => {
  const url = new URL(`${BASE}/api/tmdb${withLanguage(path, language)}`)
  return parseTmdbRequest(url.pathname, url.search)
}

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

// The list is only useful if it lets through everything the app really asks for.
describe('the requests the app makes', () => {
  it.each(['en-US', 'ru-RU', 'kk-KZ'])('every endpoint builder passes in %s', (language) => {
    const paths = [
      endpoints.genres('movie'),
      endpoints.genres('tv'),
      endpoints.trending('movie'),
      endpoints.trending('tv'),
      endpoints.searchSeries({ query: 'Игра престолов: сезон 1', page: 2, year: '2011' }),
      endpoints.searchMovies({ query: "Ocean's Eleven", year: '2001' }),
      endpoints.searchPeople({ query: 'Нолан' }),
      endpoints.searchCollections({ query: 'Dark Knight' }),
      endpoints.seriesSummary(1399),
      endpoints.seriesDetails(1399, language),
      endpoints.movieSummary(550),
      endpoints.movieDetails(550, language),
      endpoints.person(525),
      endpoints.collection(263),
      endpoints.season(1399, 3),
      endpoints.seasonsBatch(
        1399,
        Array.from({ length: 20 }, (_, i) => i + 1),
      ),
      endpoints.discoverSeries({}),
      endpoints.discoverMovies({}),
    ]
    for (const path of paths) expect(parse(path, language), path).not.toBeNull()
  })

  it('every catalogue filter combination passes', () => {
    const yearValues = ['', ...YEAR_OPTIONS.map((o) => o.value)]
    const sorts = SORT_OPTIONS.map((o) => o.value)
    for (const mediaType of ['movie', 'tv'] as const) {
      for (const sort of sorts) {
        for (const year of [yearValues[0], yearValues[1], yearValues.at(-1)]) {
          for (const rating of RATING_OPTIONS.map((o) => o.value)) {
            const filters: CatalogFilters = {
              genre: '878',
              year: year ?? '',
              rating,
              lang: 'ko',
              status: mediaType === 'tv' ? (STATUS_OPTIONS.at(-1)?.value ?? '') : '',
              runtime: mediaType === 'movie' ? (RUNTIME_OPTIONS.at(-1)?.value ?? '') : '',
              sort,
            }
            for (const query of ['', 'matrix']) {
              const path = catalogPath(mediaType, filters, query, 3)
              expect(parse(path), path).not.toBeNull()
            }
          }
        }
      }
    }
  })
})
