import { useEffect, useState } from 'react'
import { loadWatchlist, saveWatchlist, WATCHLIST_KEY } from '../storage/watchlistStorage.js'
import { WatchlistContext } from './watchlistContext.js'

/**
 * The watchlist is needed by two routes (series details and /watchlist), so its state
 * lives here, above the router outlet, instead of in either page. Every update is
 * immutable: add → spread into a new array, update → map, remove → filter.
 */
export default function WatchlistProvider({ children }) {
  // Lazy initializer: localStorage is read once on mount, not on every render.
  const [entries, setEntries] = useState(loadWatchlist)

  // Keep localStorage in sync with state.
  useEffect(() => {
    saveWatchlist(entries)
  }, [entries])

  // Another tab changed the watchlist → pick up its version. Cleanup removes the listener.
  useEffect(() => {
    function handleStorage(event) {
      if (event.key === WATCHLIST_KEY) setEntries(loadWatchlist())
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  function addEntry(data) {
    const now = new Date().toISOString()
    const entry = { ...data, id: crypto.randomUUID(), addedAt: now, updatedAt: now }
    setEntries((prev) => [entry, ...prev])
    return entry
  }

  function updateEntry(id, changes) {
    const updatedAt = new Date().toISOString()
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...changes, updatedAt } : e)))
  }

  function removeEntry(id) {
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }

  // Puts a removed entry back where it was (used by "Undo").
  function restoreEntry(entry, index) {
    setEntries((prev) => [...prev.slice(0, index), entry, ...prev.slice(index)])
  }

  const value = { entries, addEntry, updateEntry, removeEntry, restoreEntry }
  return <WatchlistContext value={value}>{children}</WatchlistContext>
}
