import { tmdbGetAll, withLanguage } from '../shared/api/tmdb'
import type { MediaType } from '../types/media'
import type { MovieListItem, Paginated, SeriesListItem } from '../types/tmdb'
import {
  mergeCatalogPages,
  tmdbPagesFor,
  type CatalogResult,
  type PageSize,
} from '../utils/catalog'
import { catalogPath, type CatalogFilters } from '../utils/filters'
import { fromMovie, fromSeries } from '../utils/media'
import { useRequest, type FetchState } from '../shared/hooks/useRequest'
import { useTmdbLanguage } from '../shared/hooks/useTmdbLanguage'

interface CatalogRequest {
  mediaType: MediaType
  filters: CatalogFilters
  query: string
  page: number
  size: PageSize
}

/**
 * One app page of a catalog. With 40 or 60 per page it loads 2 or 3 TMDB pages in
 * parallel (Promise.all) under one AbortController, and merges them.
 *
 * The request key is the joined list of TMDB paths: it changes exactly when the query,
 * a filter, the page or the size changes, so the same params never fetch twice and an
 * outdated response is ignored (see useRequest).
 */
export function useCatalog({
  mediaType,
  filters,
  query,
  page,
  size,
}: CatalogRequest): FetchState<CatalogResult> {
  const language = useTmdbLanguage()
  const paths = tmdbPagesFor(page, size).map((tmdbPage) =>
    withLanguage(catalogPath(mediaType, filters, query, tmdbPage), language),
  )

  return useRequest(paths.join('\n'), async (_key, signal) => {
    // Two branches instead of a cast: TypeScript checks each normalizer against its type.
    if (mediaType === 'movie') {
      const pages = await tmdbGetAll<Paginated<MovieListItem>>(paths, { signal })
      return mergeCatalogPages(pages, fromMovie, size)
    }
    const pages = await tmdbGetAll<Paginated<SeriesListItem>>(paths, { signal })
    return mergeCatalogPages(pages, fromSeries, size)
  })
}
