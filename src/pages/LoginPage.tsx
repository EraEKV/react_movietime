import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router'
import AuthLayout from '../components/auth/AuthLayout'
import styles from '../components/auth/AuthLayout.module.css'
import ForgotPasswordDialog from '../components/auth/ForgotPasswordDialog'
import GoogleButton from '../components/auth/GoogleButton'
import Banner from '../components/Banner/Banner'
import Button from '../components/Button/Button'
import TextField from '../components/TextField/TextField'
import { useAuth } from '../hooks/useAuth'
import { useForm } from '../hooks/useForm'
import { errorField } from '../utils/firebaseErrors'
import { validateEmail, validatePassword } from '../utils/validation'

export default function LoginPage() {
  const { search } = useLocation()
  const { signIn, pending, error, clearError } = useAuth()
  const [resetOpen, setResetOpen] = useState(false)
  const form = useForm({ email: '', password: '' }, (v) => ({
    email: validateEmail(v.email),
    password: validatePassword(v.password),
  }))

  // Cleanup on unmount: an error from this page shouldn't greet the user on the next one.
  useEffect(() => clearError, [clearError])

  // A server error goes under the field it's about, otherwise into the banner.
  const serverField = error ? errorField(error.code) : null
  const fieldError = (field: 'email' | 'password') =>
    form.errors[field] ?? (serverField === field ? error?.message : null)

  function change(field: 'email' | 'password', value: string) {
    form.setValue(field, value)
    if (error) clearError()
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!form.trySubmit()) return
    // On success GuestRoute sees the user and redirects; nothing to do here.
    await signIn(form.values.email, form.values.password)
  }

  return (
    <AuthLayout>
      <title>Sign in · Movietime</title>
      <div className={styles.heading}>
        <h1 className={styles.title}>Welcome back</h1>
        <p className={styles.subtitle}>Sign in to sync your library and plans.</p>
      </div>

      {error && !serverField && <Banner tone="warning">{error.message}</Banner>}

      <GoogleButton />
      <div className={styles.divider}>or with email</div>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <TextField
          label="Email"
          type="email"
          value={form.values.email}
          onChange={(value) => change('email', value)}
          onBlur={() => form.blur('email')}
          error={fieldError('email')}
          autoComplete="email"
          placeholder="you@example.com"
        />
        <div className={styles.passwordGroup}>
          <TextField
            label="Password"
            type="password"
            value={form.values.password}
            onChange={(value) => change('password', value)}
            onBlur={() => form.blur('password')}
            error={fieldError('password')}
            autoComplete="current-password"
          />
          <button
            type="button"
            className={`${styles.link} ${styles.forgot}`}
            onClick={() => setResetOpen(true)}
          >
            Forgot password?
          </button>
        </div>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          block
          loading={pending === 'email'}
          disabled={pending !== null}
        >
          Sign in
        </Button>
      </form>

      <p className={styles.footer}>
        New to Movietime?
        {/* Keeps ?redirect= so signing up also returns the user where they were going. */}
        <Link to={`/signup${search}`} className={styles.link}>
          Create an account
        </Link>
      </p>

      <ForgotPasswordDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        initialEmail={form.values.email}
      />
    </AuthLayout>
  )
}
