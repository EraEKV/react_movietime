import { useState, type FormEvent } from 'react'
import { resetPassword } from '../../services/authService'
import { toAuthError } from '../../utils/firebaseErrors'
import { validateEmail } from '../../utils/validation'
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
          If an account exists for <strong>{email.trim()}</strong>, a reset link is on its way.
          Check your inbox and spam folder.
        </p>
        <Button variant="primary" block onClick={onClose}>
          Back to sign in
        </Button>
      </>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate style={{ display: 'grid', gap: 'var(--space-4)' }}>
      <p style={{ margin: 0, color: 'var(--text-muted)' }}>
        Enter your account email and we’ll send a link to set a new password.
      </p>
      <TextField
        label="Email"
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
        Send reset link
      </Button>
    </form>
  )
}

export default function ForgotPasswordDialog({
  open,
  onClose,
  initialEmail,
}: ForgotPasswordDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title="Reset password">
      {/* Mounted only while open, so every opening starts from a fresh form. */}
      {open && <ResetForm initialEmail={initialEmail} onClose={onClose} />}
    </Dialog>
  )
}
