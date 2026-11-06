import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import Banner from '../Banner/Banner'
import Button from '../Button/Button'

/**
 * Reminder for email/password accounts that aren't verified yet. Verification matters:
 * Firestore rules give access to shared lists and plans only to verified emails.
 */
export default function VerifyEmailBanner() {
  const { user, pending, resendVerification, refreshUser } = useAuth()
  const [sent, setSent] = useState(false)

  if (!user || user.emailVerified || !user.providers.includes('password')) return null

  return (
    <Banner
      tone="warning"
      action={
        <>
          <Button
            size="sm"
            variant="ghost"
            loading={pending === 'verify'}
            onClick={() => void refreshUser()}
          >
            I’ve verified
          </Button>
          <Button
            size="sm"
            disabled={sent || pending !== null}
            onClick={async () => setSent(await resendVerification())}
          >
            {sent ? 'Sent' : 'Resend email'}
          </Button>
        </>
      }
    >
      Verify <strong>{user.email}</strong> to use shared lists and plans.
    </Banner>
  )
}
