import { useAuth } from '../../hooks/useAuth'
import { loginPath } from '../../utils/redirect'
import ButtonLink from '../ButtonLink/ButtonLink'

/** Series page action: opens the stepper with the series picked. Guests sign in first. */
export default function PlanWatchingButton({ seriesId }: { seriesId: number }) {
  const { isAuthenticated } = useAuth()
  const target = `/planner/new?series=${seriesId}`
  return (
    <ButtonLink to={isAuthenticated ? target : loginPath(target)} variant="primary" icon="calendar">
      Plan watching
    </ButtonLink>
  )
}
