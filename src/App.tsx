import { Route, Routes } from 'react-router'
import Layout from './components/Layout/Layout'
import WatchlistProvider from './context/WatchlistProvider'
import HomePage from './pages/HomePage'
import NotFoundPage from './pages/NotFoundPage'
import SeriesPage from './pages/SeriesPage'
import WatchlistAddPage from './pages/WatchlistAddPage'
import WatchlistEditPage from './pages/WatchlistEditPage'
import WatchlistPage from './pages/WatchlistPage'

export default function App() {
  return (
    <WatchlistProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="series/:id" element={<SeriesPage />} />
          <Route path="watchlist" element={<WatchlistPage />} />
          <Route path="watchlist/new" element={<WatchlistAddPage />} />
          <Route path="watchlist/:entryId/edit" element={<WatchlistEditPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </WatchlistProvider>
  )
}
