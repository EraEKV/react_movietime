import { useAuth } from '../../hooks/useAuth'
import Button from '../Button/Button'

/** One Google button for login and signup: Firebase creates the account on first use. */
export default function GoogleButton() {
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
      Continue with Google
    </Button>
  )
}
