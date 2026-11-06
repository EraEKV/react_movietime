import { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import AuthLayout from './components/auth/AuthLayout'
import GuestRoute from './components/auth/GuestRoute'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Layout from './components/Layout/Layout'
import WatchlistProvider from './context/WatchlistProvider'
import LoginPage from './pages/LoginPage'
import NotFoundPage from './pages/NotFoundPage'
import SignupPage from './pages/SignupPage'
import VerifyEmailPage from './pages/VerifyEmailPage'

// Each lazy() page becomes its own JS chunk, downloaded the first time its route renders.
// The <Suspense> boundary that shows a skeleton meanwhile lives in Layout, around <Outlet>,
// so the header and tab bar stay on screen. Auth screens and 404 are small and stay eager.
const CatalogPage = lazy(() => import('./pages/CatalogPage'))
const SeriesPage = lazy(() => import('./pages/SeriesPage'))
const WatchlistPage = lazy(() => import('./pages/WatchlistPage'))
const WatchlistAddPage = lazy(() => import('./pages/WatchlistAddPage'))
const WatchlistEditPage = lazy(() => import('./pages/WatchlistEditPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))

export default function App() {
  return (
    <WatchlistProvider>
      <Routes>
        {/* Auth screens have their own split layout, without the app header. */}
        <Route element={<AuthLayout />}>
          <Route element={<GuestRoute />}>
            <Route path="login" element={<LoginPage />} />
          </Route>
          <Route element={<GuestRoute unverifiedTo="/verify-email" />}>
            <Route path="signup" element={<SignupPage />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route path="verify-email" element={<VerifyEmailPage />} />
          </Route>
        </Route>

        <Route element={<Layout />}>
          {/* Temporary: the landing page replaces this redirect. */}
          <Route index element={<Navigate to="/series" replace />} />
          <Route path="series" element={<CatalogPage />} />
          <Route path="series/:id" element={<SeriesPage />} />
          <Route path="watchlist" element={<WatchlistPage />} />
          <Route path="watchlist/new" element={<WatchlistAddPage />} />
          <Route path="watchlist/:entryId/edit" element={<WatchlistEditPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="profile" element={<ProfilePage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </WatchlistProvider>
  )
}
