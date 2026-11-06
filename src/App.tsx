import { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import AuthLayout from './components/auth/AuthLayout'
import GuestRoute from './components/auth/GuestRoute'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Layout from './components/Layout/Layout'
import WatchlistProvider from './context/WatchlistProvider'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import NotFoundPage from './pages/NotFoundPage'
import SignupPage from './pages/SignupPage'
import VerifyEmailPage from './pages/VerifyEmailPage'

// Each lazy() page becomes its own JS chunk, downloaded the first time its route renders.
// The <Suspense> boundary that shows a skeleton meanwhile lives in Layout, around <Outlet>,
// so the header and tab bar stay on screen. Home (the first screen most visitors see),
// auth screens and 404 stay in the main bundle.
const AboutPage = lazy(() => import('./pages/AboutPage'))
const CatalogPage = lazy(() => import('./pages/CatalogPage'))
const SeriesPage = lazy(() => import('./pages/SeriesPage'))
const WatchlistPage = lazy(() => import('./pages/WatchlistPage'))
const WatchlistAddPage = lazy(() => import('./pages/WatchlistAddPage'))
const WatchlistEditPage = lazy(() => import('./pages/WatchlistEditPage'))
const ProfileLayout = lazy(() => import('./components/Layout/ProfileLayout'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const OfflinePage = lazy(() => import('./pages/OfflinePage'))
const ComingSoonPage = lazy(() => import('./pages/ComingSoonPage'))

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
          <Route path="about" element={<AboutPage />} />

          {/* One CatalogPage for both catalogs. Different keys make React mount a new
              instance on Movies ⇄ Series instead of reusing the old one's state. */}
          <Route path="movies">
            <Route index element={<CatalogPage key="movie" mediaType="movie" />} />
            <Route
              path=":id"
              element={
                <ComingSoonPage
                  title="Movie details"
                  icon="film"
                  body="Cast, director, budget, trailer and recommendations for every movie."
                />
              }
            />
          </Route>
          <Route path="series">
            <Route index element={<CatalogPage key="tv" mediaType="tv" />} />
            <Route path=":id" element={<SeriesPage />} />
          </Route>

          <Route path="library">
            <Route index element={<WatchlistPage />} />
            <Route path="new" element={<WatchlistAddPage />} />
            <Route path=":entryId/edit" element={<WatchlistEditPage />} />
          </Route>
          {/* Old links from the midterm version keep working. */}
          <Route path="watchlist/*" element={<Navigate to="/library" replace />} />

          <Route element={<ProtectedRoute />}>
            <Route
              path="lists"
              element={
                <ComingSoonPage
                  title="Lists"
                  icon="list"
                  body="Named collections of titles you can share with friends as editors or viewers."
                />
              }
            />
            <Route
              path="planner"
              element={
                <ComingSoonPage
                  title="Planner"
                  icon="calendar"
                  body="Turn a series or a list into a schedule of viewing nights with a finish date."
                />
              }
            />
            <Route
              path="dashboard"
              element={
                <ComingSoonPage
                  title="Dashboard"
                  icon="chart"
                  body="Statistics from your library and plans: what you watch, how much and when."
                />
              }
            />
            <Route path="profile" element={<ProfileLayout />}>
              <Route index element={<ProfilePage />} />
              <Route
                path="settings"
                element={
                  <ComingSoonPage
                    title="Settings"
                    icon="settings"
                    body="Display name, theme, language and notifications in one place."
                  />
                }
              />
            </Route>
          </Route>

          <Route path="offline" element={<OfflinePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </WatchlistProvider>
  )
}
