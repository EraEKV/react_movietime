import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { useLocation } from 'react-router'
import { useAuth } from '../../hooks/useAuth'
import type { LibraryMedia } from '../../types/library'
import { loginPath } from '../../shared/lib/redirect'
import Button from '../../shared/ui/Button/Button'
import ButtonLink from '../../shared/ui/ButtonLink/ButtonLink'
import PlanMovieDialog from './PlanMovieDialog'

/** Movie page action: opens the "pick a day" dialog. Guests sign in first. */
export default function PlanMovieButton({ media }: { media: LibraryMedia }) {
  const { t } = useTranslation('planner')
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  const [open, setOpen] = useState(false)

  if (!isAuthenticated) {
    return (
      <ButtonLink
        to={loginPath(location.pathname + location.search)}
        variant="primary"
        icon="calendar"
      >
        {t('movie.button')}
      </ButtonLink>
    )
  }
  return (
    <>
      <Button variant="primary" icon="calendar" onClick={() => setOpen(true)}>
        {t('movie.button')}
      </Button>
      {open && <PlanMovieDialog media={media} onClose={() => setOpen(false)} />}
    </>
  )
}
