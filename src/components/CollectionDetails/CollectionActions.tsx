import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { useLocation } from 'react-router'
import { useAuth } from '../../hooks/useAuth'
import { loginPath } from '../../shared/lib/redirect'
import Button from '../../shared/ui/Button/Button'
import ButtonLink from '../../shared/ui/ButtonLink/ButtonLink'
import type { CollectionFilm } from '../../utils/collection'
import AddCollectionDialog from './AddCollectionDialog'

interface CollectionActionsProps {
  collectionId: number
  name: string
  films: CollectionFilm[]
  /** Films that are out: a marathon plans only these. */
  releasedCount: number
  /** The film after the last one you have seen: "Continue" starts there. */
  resume?: CollectionFilm | null
}

/**
 * "Add all to a list", "Continue" (after the last film you have seen) and "Plan a marathon".
 * Lists and plans need an account: a guest is
 * sent to sign in and comes back here (the planner route does the same on its own).
 */
export default function CollectionActions({
  collectionId,
  name,
  films,
  releasedCount,
  resume = null,
}: CollectionActionsProps) {
  const { t } = useTranslation('collection')
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  const [open, setOpen] = useState(false)

  if (films.length === 0) return null

  return (
    <>
      {isAuthenticated ? (
        <Button icon="list" onClick={() => setOpen(true)}>
          {t('actions.addAll')}
        </Button>
      ) : (
        <ButtonLink to={loginPath(location.pathname + location.search)} icon="list">
          {t('actions.addAll')}
        </ButtonLink>
      )}
      {resume && (
        <ButtonLink
          to={`/planner/new?collection=${collectionId}&from=${resume.id}`}
          variant="primary"
          icon="play"
        >
          {t('actions.continue', { title: resume.title })}
        </ButtonLink>
      )}
      {releasedCount > 0 && (
        <ButtonLink
          to={`/planner/new?collection=${collectionId}`}
          variant={resume ? 'secondary' : 'primary'}
          icon="calendar"
        >
          {t(resume ? 'actions.planAll' : 'actions.plan')}
        </ButtonLink>
      )}
      {open && <AddCollectionDialog name={name} films={films} onClose={() => setOpen(false)} />}
    </>
  )
}
