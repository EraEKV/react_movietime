import { use } from 'react'
import { WatchlistContext } from '../context/watchlistContext.js'

export function useWatchlist() {
  const context = use(WatchlistContext)
  if (!context) throw new Error('useWatchlist must be used inside <WatchlistProvider>')
  return context
}
