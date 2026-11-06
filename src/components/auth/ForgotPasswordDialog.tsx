import { Trans, useTranslation } from 'react-i18next'
import { useState, type FormEvent } from 'react'
import { resetPassword } from '../../services/authService'
import { toAuthError } from '../../utils/firebaseErrors'
import { validateEmail } from '../../shared/lib/validation'
import Button from '../Button/Button'
import Dialog from '../Dialog/Dialog'
import TextField from '../TextField/TextField'

interface ForgotPasswordDialogProps {
  open: boolean
  onClose: () => void
  /** The email already typed on the login form, so it isn't typed twice. */
  initialEmail: string
}

type Status = 'idle' | 'sending' | 'sent'

// Local state only: nothing else in the app cares about a reset request.
function ResetForm({ initialEmail, onClose }: Omit<ForgotPasswordDialogProps, 'open'>) {
  const { t } = useTranslation('auth')
  const [email, setEmail] = useState(initialEmail)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const invalid = validateEmail(email)
    if (invalid) return setError(invalid)
    setStatus('sending')
    try {
      await resetPassword(email)
      setStatus('sent')
    } catch (err) {
      setError(toAuthError(err).message)
      setStatus('idle')
    }
  }

  if (status === 'sent') {
    return (
      <>
        {/* Same text whether or not the account exists: the form can't be used to check emails. */}
        <p role="status">
          <Trans
            t={t}
            i18nKey="reset.sent"
            values={{ email: email.trim() }}
            components={{ strong: <strong /> }}
          />
        </p>
        <Button variant="primary" block onClick={onClose}>
          {t('reset.back')}
        </Button>
      </>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate style={{ display: 'grid', gap: 'var(--space-4)' }}>
      <p style={{ margin: 0, color: 'var(--text-muted)' }}>{t('reset.intro')}</p>
      <TextField
        label={t('email')}
        type="email"
        value={email}
        onChange={(value) => {
          setEmail(value)
          setError(null)
        }}
        error={error}
        autoComplete="email"
        autoFocus
      />
      <Button type="submit" variant="primary" block loading={status === 'sending'}>
        {t('reset.submit')}
      </Button>
    </form>
  )
}

export default function ForgotPasswordDialog({
  open,
  onClose,
  initialEmail,
}: ForgotPasswordDialogProps) {
  const { t } = useTranslation('auth')
  return (
    <Dialog open={open} onClose={onClose} title={t('reset.title')}>
      {/* Mounted only while open, so every opening starts from a fresh form. */}
      {open && <ResetForm initialEmail={initialEmail} onClose={onClose} />}
    </Dialog>
  )
}
