import { endpoints, isAbortError, tmdbGet, withLanguage } from '../shared/api/tmdb'
import { useDebouncedValue } from '../shared/hooks/useDebouncedValue'
import { useRequest } from '../shared/hooks/useRequest'
import { useTmdbLanguage } from '../shared/hooks/useTmdbLanguage'
import type { CollectionSearchItem, Paginated, PersonSearchItem } from '../types/tmdb'
import { limitHits, toCollectionHit, toPersonHit, type SiteSearchData } from '../utils/search'
import { MIN_LENGTH, searchTitles } from './useTitleSearch'

/**
 * An extra group (people, collections) must never break the search: if its request fails,
 * the group is just empty and the titles still show. A cancelled request is not a failure.
 */
async function optionalGroup<T>(request: Promise<Paginated<T>>): Promise<T[]> {
  try {
    return (await request).results
  } catch (error) {
    if (isAbortError(error)) throw error
    return []
  }
}

/**
 * Header search: titles, people and collections for one query (four TMDB requests, one
 * AbortSignal), debounced like the title search. Only the titles can fail the search.
 */
export function useSiteSearch(query: string) {
  const debounced = useDebouncedValue(query.trim(), 350)
  const language = useTmdbLanguage()
  const key = debounced.length >= MIN_LENGTH ? `${language}|${debounced}` : null

  const state = useRequest<SiteSearchData>(key, async (currentKey, signal) => {
    const q = currentKey.slice(language.length + 1)
    const [titles, people, collections] = await Promise.all([
      searchTitles(q, language, signal),
      optionalGroup(
        tmdbGet<Paginated<PersonSearchItem>>(
          withLanguage(endpoints.searchPeople({ query: q }), language),
          { signal },
        ),
      ),
      optionalGroup(
        tmdbGet<Paginated<CollectionSearchItem>>(
          withLanguage(endpoints.searchCollections({ query: q }), language),
          { signal },
        ),
      ),
    ])
    return limitHits({
      titles,
      people: people.map(toPersonHit),
      collections: collections.map(toCollectionHit),
    })
  })

  const pending = query.trim() !== debounced && query.trim().length >= MIN_LENGTH
  return { ...state, pending, tooShort: query.trim().length < MIN_LENGTH }
}
