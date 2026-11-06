import { Trans, useTranslation } from 'react-i18next'
import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import Banner from '../Banner/Banner'
import Button from '../Button/Button'

/**
 * Reminder for email/password accounts that aren't verified yet. Verification matters:
 * Firestore rules give access to shared lists and plans only to verified emails.
 */
export default function VerifyEmailBanner() {
  const { t } = useTranslation()
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
            {t('verify.done')}
          </Button>
          <Button
            size="sm"
            disabled={sent || pending !== null}
            onClick={async () => setSent(await resendVerification())}
          >
            {t(sent ? 'verify.sent' : 'verify.resend')}
          </Button>
        </>
      }
    >
      <Trans
        i18nKey="verify.text"
        values={{ email: user.email }}
        components={{ strong: <strong /> }}
      />
    </Banner>
  )
}
