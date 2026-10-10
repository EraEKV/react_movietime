import { Route, Routes } from 'react-router'
import Layout from './components/Layout/Layout.jsx'
import WatchlistProvider from './context/WatchlistProvider.jsx'
import HomePage from './pages/HomePage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import SeriesPage from './pages/SeriesPage.jsx'
import WatchlistAddPage from './pages/WatchlistAddPage.jsx'
import WatchlistEditPage from './pages/WatchlistEditPage.jsx'
import WatchlistPage from './pages/WatchlistPage.jsx'

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
