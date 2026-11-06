import { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import AuthLayout from './components/auth/AuthLayout'
import GuestRoute from './components/auth/GuestRoute'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Layout from './components/Layout/Layout'
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
const MoviePage = lazy(() => import('./pages/MoviePage'))
const SeriesPage = lazy(() => import('./pages/SeriesPage'))
const LibraryPage = lazy(() => import('./pages/LibraryPage'))
const LibraryEditPage = lazy(() => import('./pages/LibraryEditPage'))
const ListsPage = lazy(() => import('./pages/ListsPage'))
const ListPage = lazy(() => import('./pages/ListPage'))
const ListFormPage = lazy(() => import('./pages/ListFormPage'))
const PlannerPage = lazy(() => import('./pages/PlannerPage'))
const CreatePlanPage = lazy(() => import('./pages/CreatePlanPage'))
const PlanPage = lazy(() => import('./pages/PlanPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const ProfileLayout = lazy(() => import('./components/Layout/ProfileLayout'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const OfflinePage = lazy(() => import('./pages/OfflinePage'))
const ComingSoonPage = lazy(() => import('./pages/ComingSoonPage'))

export default function App() {
  return (
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
          <Route path=":id" element={<MoviePage />} />
        </Route>
        <Route path="series">
          <Route index element={<CatalogPage key="tv" mediaType="tv" />} />
          <Route path=":id" element={<SeriesPage />} />
        </Route>

        <Route path="library">
          <Route index element={<LibraryPage />} />
          <Route path=":mediaKey/edit" element={<LibraryEditPage />} />
        </Route>
        {/* Old links from the midterm version keep working. */}
        <Route path="watchlist/*" element={<Navigate to="/library" replace />} />

        {/* Public on purpose: a shared link opens for guests too (read-only). What each
              visitor may see and do is decided by Firestore rules; the page only follows. */}
        <Route path="lists/:id" element={<ListPage />} />
        <Route path="planner/:id" element={<PlanPage />} />
        {/* Guests have a library too (localStorage), so their stats work without an
              account; the plan sections ask them to sign in instead. */}
        <Route path="dashboard" element={<DashboardPage />} />

        <Route element={<ProtectedRoute />}>
          {/* Your lists, creating and editing need an account. "new" is a static segment,
                so it wins over the dynamic ":id" above regardless of order. */}
          <Route path="lists">
            <Route index element={<ListsPage />} />
            <Route path="new" element={<ListFormPage />} />
            <Route path=":id/edit" element={<ListFormPage />} />
          </Route>
          {/* "new" is static, so it wins over the public "planner/:id" above. */}
          <Route path="planner">
            <Route index element={<PlannerPage />} />
            <Route path="new" element={<CreatePlanPage />} />
          </Route>
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
  )
}
