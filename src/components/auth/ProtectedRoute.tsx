import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../../hooks/useAuth'
import { loginPath } from '../../utils/redirect'
import PageLoader from '../PageLoader/PageLoader'

/**
 * Layout route for pages that need an account. This is UX only: it hides pages from guests.
 * The data itself is protected by Firestore security rules, which run on the server.
 */
export default function ProtectedRoute() {
  const { status } = useAuth()
  const { pathname, search, hash } = useLocation()

  // Firebase restores the session asynchronously; redirecting now would kick out a
  // signed-in user on every page reload.
  if (status === 'loading') return <PageLoader />

  if (status === 'guest') {
    // replace: the protected URL doesn't stay in history, so Back doesn't bounce to login again.
    return <Navigate to={loginPath(pathname + search + hash)} replace />
  }

  return <Outlet />
}
