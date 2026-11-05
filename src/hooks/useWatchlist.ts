import { use } from 'react'
import { WatchlistContext, type WatchlistContextValue } from '../context/watchlistContext'

export function useWatchlist(): WatchlistContextValue {
  const context = use(WatchlistContext)
  if (!context) throw new Error('useWatchlist must be used inside <WatchlistProvider>')
  return context
}
