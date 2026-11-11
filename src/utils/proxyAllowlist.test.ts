import { describe, expect, it } from 'vitest'
import { parseTmdbRequest } from '../../api/_lib/tmdb'
import {
  catalogPath,
  RATING_OPTIONS,
  RUNTIME_OPTIONS,
  SORT_OPTIONS,
  STATUS_OPTIONS,
  YEAR_OPTIONS,
  type CatalogFilters,
} from './filters'
import { endpoints, withLanguage } from '../shared/api/tmdb'

const parse = (path: string, language = 'en-US') => {
  const url = new URL(`https://avleron.com/api/tmdb${withLanguage(path, language)}`)
  return parseTmdbRequest(url.pathname, url.search)
}

// The proxy's list (api/_lib/tmdb.ts) is only useful if it lets through everything the app
// really asks for, so the app's own request builders are run through it.
describe('the TMDB proxy allow-list', () => {
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
