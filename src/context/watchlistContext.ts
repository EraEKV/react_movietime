import { createContext } from 'react'
import type { NewWatchlistEntry, WatchlistChanges, WatchlistEntry } from '../types/watchlist'

export interface WatchlistContextValue {
  entries: WatchlistEntry[]
  addEntry: (data: NewWatchlistEntry) => WatchlistEntry
  updateEntry: (id: string, changes: WatchlistChanges) => void
  removeEntry: (id: string) => void
  restoreEntry: (entry: WatchlistEntry, index: number) => void
}

export const WatchlistContext = createContext<WatchlistContextValue | null>(null)
