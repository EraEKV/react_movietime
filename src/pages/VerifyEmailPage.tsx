import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import AuthLayout from '../components/auth/AuthLayout'
import styles from '../components/auth/AuthLayout.module.css'
import Banner from '../components/Banner/Banner'
import Button from '../components/Button/Button'
import Icon from '../components/Icon/Icon'
import { useAuth } from '../hooks/useAuth'
import { safeRedirect } from '../utils/redirect'

/** After email signup: "check your inbox", resend, "I've verified", or start over. */
export default function VerifyEmailPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const next = safeRedirect(searchParams.get('redirect'))
  const { user, pending, error, resendVerification, refreshUser, signOut } = useAuth()
  const [notice, setNotice] = useState<string | null>(null)

  const verified = user?.emailVerified ?? false

  async function handleResend() {
    if (await resendVerification()) setNotice('Sent again. It can take a minute — check spam too.')
  }

  async function handleCheck() {
    // On success the new token updates the store, and this page re-renders as "verified".
    const fresh = await refreshUser()
    if (fresh && !fresh.emailVerified) {
      setNotice('Not verified yet. Open the link from the email, then try again.')
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
      <AuthLayout>
        <title>Email verified · Movietime</title>
        <span className={styles.iconTile}>
          <Icon name="check" size={30} />
        </span>
        <h1 className={styles.title}>Email verified</h1>
        <p className={styles.subtitle}>
          You’re all set: lists and plans shared with this email will show up for you.
        </p>
        <Button variant="primary" size="lg" block onClick={() => navigate(next, { replace: true })}>
          Continue to Movietime
        </Button>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <title>Verify your email · Movietime</title>
      <span className={styles.iconTile}>
        <Icon name="mail" size={30} />
      </span>
      <h1 className={styles.title}>Check your email to verify</h1>
      <p className={styles.subtitle}>
        We sent a link to <strong className={styles.strong}>{user?.email}</strong>. Open it to
        finish signing up. You can keep using Movietime meanwhile.
      </p>

      {error && <Banner tone="warning">{error.message}</Banner>}
      {notice && !error && (
        <p className={styles.subtitle} role="status">
          {notice}
        </p>
      )}

      <Button variant="primary" size="lg" block onClick={() => navigate(next, { replace: true })}>
        Continue to Movietime
      </Button>
      <Button size="lg" block loading={pending === 'verify'} onClick={() => void handleCheck()}>
        I’ve verified my email
      </Button>

      <p className={styles.footer}>
        Didn’t get it?
        <button
          type="button"
          className={styles.link}
          disabled={pending !== null}
          onClick={() => void handleResend()}
        >
          Resend email
        </button>
        <span aria-hidden="true">·</span>
        <button type="button" className={styles.link} onClick={handleChangeEmail}>
          Change email
        </button>
      </p>
    </AuthLayout>
  )
}
