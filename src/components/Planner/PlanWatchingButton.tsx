import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import { loginPath } from '../../shared/lib/redirect'
import ButtonLink from '../ButtonLink/ButtonLink'

/** Series page action: opens the stepper with the series picked. Guests sign in first. */
export default function PlanWatchingButton({ seriesId }: { seriesId: number }) {
  const { t } = useTranslation('planner')
  const { isAuthenticated } = useAuth()
  const target = `/planner/new?series=${seriesId}`
  return (
    <ButtonLink to={isAuthenticated ? target : loginPath(target)} variant="primary" icon="calendar">
      {t('watching')}
    </ButtonLink>
  )
}
