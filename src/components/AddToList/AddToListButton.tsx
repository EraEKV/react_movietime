import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { useLocation } from 'react-router'
import { useAuth } from '../../hooks/useAuth'
import type { ListMedia } from '../../types/list'
import { loginPath } from '../../utils/redirect'
import Button from '../Button/Button'
import ButtonLink from '../ButtonLink/ButtonLink'
import AddToListDialog from './AddToListDialog'

/** Title page action. Lists need an account, so guests are sent to sign in and back. */
export default function AddToListButton({ media }: { media: ListMedia }) {
  const { t } = useTranslation('sharing')
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  const [open, setOpen] = useState(false)

  if (!isAuthenticated) {
    return (
      <ButtonLink to={loginPath(location.pathname + location.search)} icon="list">
        {t('addTo.button')}
      </ButtonLink>
    )
  }

  return (
    <>
      <Button icon="list" onClick={() => setOpen(true)}>
        {t('addTo.button')}
      </Button>
      {open && <AddToListDialog media={media} onClose={() => setOpen(false)} />}
    </>
  )
}
