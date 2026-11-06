import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import Button from '../../shared/ui/Button/Button'

/** One Google button for login and signup: Firebase creates the account on first use. */
export default function GoogleButton() {
  const { t } = useTranslation('auth')
  const { signInWithGoogle, pending } = useAuth()
  return (
    <Button
      size="lg"
      block
      icon="google"
      loading={pending === 'google'}
      disabled={pending !== null}
      onClick={() => void signInWithGoogle()}
    >
      {t('google')}
    </Button>
  )
}
