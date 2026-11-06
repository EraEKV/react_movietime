import { Route, Routes } from 'react-router'
import AuthLayout from './components/auth/AuthLayout'
import GuestRoute from './components/auth/GuestRoute'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Layout from './components/Layout/Layout'
import WatchlistProvider from './context/WatchlistProvider'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import NotFoundPage from './pages/NotFoundPage'
import ProfilePage from './pages/ProfilePage'
import SeriesPage from './pages/SeriesPage'
import SignupPage from './pages/SignupPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import WatchlistAddPage from './pages/WatchlistAddPage'
import WatchlistEditPage from './pages/WatchlistEditPage'
import WatchlistPage from './pages/WatchlistPage'

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
          <Route index element={<HomePage />} />
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
