import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { resendVerification } from '../../store/authSlice'
import { useAppDispatch } from '../../store/hooks'
import Button from '../Button/Button'

interface ResendVerificationProps {
  size?: 'sm' | 'md'
  label?: string
  /** Called with the outcome so the parent can show it where it fits (banner or row). */
  onResult: (result: { ok: true } | { ok: false; message: string }) => void
}

/**
 * "Resend email" for an unverified address. Disabled after a successful send: Firebase
 * rate-limits verification emails, and one in the inbox is enough.
 */
export default function ResendVerification({
  size = 'sm',
  label = 'Resend email',
  onResult,
}: ResendVerificationProps) {
  const { pending } = useAuth()
  const dispatch = useAppDispatch()
  const [sent, setSent] = useState(false)

  async function handleClick() {
    // The thunk's own result, not the store's `error`: that one would be from the last render.
    const result = await dispatch(resendVerification())
    if (resendVerification.fulfilled.match(result)) {
      setSent(true)
      onResult({ ok: true })
    } else {
      onResult({ ok: false, message: result.payload?.message ?? 'Couldn’t send the email.' })
    }
  }

  return (
    <Button
      size={size}
      icon="mail"
      loading={pending === 'verify'}
      disabled={sent}
      onClick={() => void handleClick()}
    >
      {sent ? 'Email sent' : label}
    </Button>
  )
}
