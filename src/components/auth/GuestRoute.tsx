import { Navigate, Outlet, useSearchParams } from 'react-router'
import { useAuth } from '../../hooks/useAuth'
import { invitePath } from '../../utils/invite'
import { safeRedirect } from '../../shared/lib/redirect'
import PageLoader from '../../shared/ui/PageLoader/PageLoader'

interface GuestRouteProps {
  /** Where a new email account goes first (signup → "check your email"). */
  unverifiedTo?: string
}

/** Layout route for login/signup: a signed-in user is sent where they were heading. */
export default function GuestRoute({ unverifiedTo }: GuestRouteProps) {
  const { status, user, pending } = useAuth()
  const [searchParams] = useSearchParams()
  // An invite link (?invite=lists/<id>) leads to that list or plan after sign-in.
  const redirect = safeRedirect(
    searchParams.get('redirect') ?? invitePath(searchParams.get('invite')),
  )

  if (status === 'loading') return <PageLoader />

  // During sign-up Firebase reports the new user before the display name is saved.
  // Waiting for the request to finish keeps the form (and its spinner) on screen until then.
  if (status === 'authenticated' && user && pending === null) {
    const needsVerification = !user.emailVerified && user.providers.includes('password')
    if (unverifiedTo && needsVerification) {
      return <Navigate to={`${unverifiedTo}?redirect=${encodeURIComponent(redirect)}`} replace />
    }
    return <Navigate to={redirect} replace />
  }

  return <Outlet />
}
