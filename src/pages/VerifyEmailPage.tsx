import { Trans, useTranslation } from 'react-i18next'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import styles from '../components/auth/AuthLayout.module.css'
import Banner from '../shared/ui/Banner/Banner'
import Button from '../shared/ui/Button/Button'
import Icon from '../shared/ui/Icon/Icon'
import { useAuth } from '../hooks/useAuth'
import { safeRedirect } from '../shared/lib/redirect'

/** After email signup: "check your inbox", resend, "I've verified", or start over. */
export default function VerifyEmailPage() {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const next = safeRedirect(searchParams.get('redirect'))
  const { user, pending, error, resendVerification, refreshUser, signOut } = useAuth()
  const [notice, setNotice] = useState<string | null>(null)

  const verified = user?.emailVerified ?? false

  async function handleResend() {
    if (await resendVerification()) setNotice(t('verify.resent'))
  }

  async function handleCheck() {
    // On success the new token updates the store, and this page re-renders as "verified".
    const fresh = await refreshUser()
    if (fresh && !fresh.emailVerified) {
      setNotice(t('verify.notYet'))
    }
  }

  function handleChangeEmail() {
    // Start signing out first (pending blocks GuestRoute's redirect), then leave this
    // protected page ourselves so ProtectedRoute doesn't bounce us to /login.
    const done = signOut()
    navigate('/signup', { replace: true })
    void done
  }

  if (verified) {
    return (
      <>
        <title>{t('verified.pageTitle')}</title>
        <span className={styles.iconTile}>
          <Icon name="check" size={30} />
        </span>
        <h1 className={styles.title}>{t('verified.title')}</h1>
        <p className={styles.subtitle}>{t('verified.body')}</p>
        <Button variant="primary" size="lg" block onClick={() => navigate(next, { replace: true })}>
          {t('verify.continue')}
        </Button>
      </>
    )
  }

  return (
    <>
      <title>{t('verify.pageTitle')}</title>
      <span className={styles.iconTile}>
        <Icon name="mail" size={30} />
      </span>
      <h1 className={styles.title}>{t('verify.title')}</h1>
      <p className={styles.subtitle}>
        <Trans
          t={t}
          i18nKey="verify.body"
          values={{ email: user?.email }}
          components={{ strong: <strong className={styles.strong} /> }}
        />
      </p>

      {error && <Banner tone="warning">{error.message}</Banner>}
      {notice && !error && (
        <p className={styles.subtitle} role="status">
          {notice}
        </p>
      )}

      <Button variant="primary" size="lg" block onClick={() => navigate(next, { replace: true })}>
        {t('verify.continue')}
      </Button>
      <Button size="lg" block loading={pending === 'verify'} onClick={() => void handleCheck()}>
        {t('verify.check')}
      </Button>

      <p className={styles.footer}>
        {t('verify.noEmail')}
        <button
          type="button"
          className={styles.link}
          disabled={pending !== null}
          onClick={() => void handleResend()}
        >
          {t('verify.resend')}
        </button>
        <span aria-hidden="true">·</span>
        <button type="button" className={styles.link} onClick={handleChangeEmail}>
          {t('verify.change')}
        </button>
      </p>
    </>
  )
}
