import { useEffect, useState, type ReactNode } from 'react'
import { loadWatchlist, saveWatchlist, WATCHLIST_KEY } from '../storage/watchlistStorage'
import type { NewWatchlistEntry, WatchlistChanges, WatchlistEntry } from '../types/watchlist'
import { WatchlistContext } from './watchlistContext'

/**
 * The watchlist is needed by two routes (series details and /watchlist), so its state
 * lives here, above the router outlet, instead of in either page. Every update is
 * immutable: add → spread into a new array, update → map, remove → filter.
 */
export default function WatchlistProvider({ children }: { children: ReactNode }) {
  // Lazy initializer: localStorage is read once on mount, not on every render.
  const [entries, setEntries] = useState<WatchlistEntry[]>(loadWatchlist)

  // Keep localStorage in sync with state.
  useEffect(() => {
    saveWatchlist(entries)
  }, [entries])

  // Another tab changed the watchlist → pick up its version. Cleanup removes the listener.
  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key === WATCHLIST_KEY) setEntries(loadWatchlist())
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  function addEntry(data: NewWatchlistEntry): WatchlistEntry {
    const now = new Date().toISOString()
    const entry: WatchlistEntry = { ...data, id: crypto.randomUUID(), addedAt: now, updatedAt: now }
    setEntries((prev) => [entry, ...prev])
    return entry
  }

  function updateEntry(id: string, changes: WatchlistChanges) {
    const updatedAt = new Date().toISOString()
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...changes, updatedAt } : e)))
  }

  function removeEntry(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }

  // Puts a removed entry back where it was (used by "Undo").
  function restoreEntry(entry: WatchlistEntry, index: number) {
    setEntries((prev) => [...prev.slice(0, index), entry, ...prev.slice(index)])
  }

  const value = { entries, addEntry, updateEntry, removeEntry, restoreEntry }
  return <WatchlistContext value={value}>{children}</WatchlistContext>
}
