import { useMemo } from 'react'
import type { LibraryStatus } from '../types/library'
import type { MediaKey } from '../types/media'
import { useLibrary } from './useLibrary'

/** The library as key → status: marks on cards and "you've seen N of M" counters. */
export function useLibraryStatuses(): ReadonlyMap<MediaKey, LibraryStatus> {
  const { entries } = useLibrary()
  return useMemo(
    () => new Map<MediaKey, LibraryStatus>(entries.map((entry) => [entry.key, entry.status])),
    [entries],
  )
}
