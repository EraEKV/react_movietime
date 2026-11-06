import { useTranslation } from 'react-i18next'
import { useEffect, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router'
import styles from '../components/auth/AuthLayout.module.css'
import GoogleButton from '../components/auth/GoogleButton'
import Banner from '../shared/ui/Banner/Banner'
import Button from '../shared/ui/Button/Button'
import PasswordChecklist from '../shared/ui/PasswordChecklist/PasswordChecklist'
import TextField from '../shared/ui/TextField/TextField'
import { useAuth } from '../hooks/useAuth'
import { useForm } from '../shared/hooks/useForm'
import { errorField } from '../utils/firebaseErrors'
import {
  DISPLAY_NAME_MAX,
  validateDisplayName,
  validateEmail,
  validateNewPassword,
  validatePasswordConfirm,
} from '../shared/lib/validation'

type Field = 'displayName' | 'email' | 'password' | 'confirm'

export default function SignupPage() {
  const { t } = useTranslation('auth')
  const { search } = useLocation()
  const { signUp, pending, error, clearError } = useAuth()
  const form = useForm<Field>({ displayName: '', email: '', password: '', confirm: '' }, (v) => ({
    displayName: validateDisplayName(v.displayName),
    email: validateEmail(v.email),
    password: validateNewPassword(v.password),
    confirm: validatePasswordConfirm(v.password, v.confirm),
  }))

  useEffect(() => clearError, [clearError])

  const serverField = error ? errorField(error.code) : null
  const fieldError = (field: Field) =>
    form.errors[field] ?? (serverField === field ? error?.message : null)

  function change(field: Field, value: string) {
    form.setValue(field, value)
    if (error) clearError()
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!form.trySubmit()) return
    // On success GuestRoute sends the new account to /verify-email.
    await signUp(form.values.displayName, form.values.email, form.values.password)
  }

  return (
    <>
      <title>{t('signup.pageTitle')}</title>
      <div className={styles.heading}>
        <h1 className={styles.title}>{t('signup.title')}</h1>
        <p className={styles.subtitle}>{t('signup.subtitle')}</p>
      </div>

      {error && !serverField && <Banner tone="warning">{error.message}</Banner>}

      <GoogleButton />
      <div className={styles.divider}>{t('orEmail')}</div>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <TextField
          label={t('signup.name')}
          value={form.values.displayName}
          onChange={(value) => change('displayName', value)}
          onBlur={() => form.blur('displayName')}
          error={fieldError('displayName')}
          hint={t('signup.nameHint')}
          maxLength={DISPLAY_NAME_MAX}
          autoComplete="nickname"
        />
        <TextField
          label={t('email')}
          type="email"
          value={form.values.email}
          onChange={(value) => change('email', value)}
          onBlur={() => form.blur('email')}
          error={fieldError('email')}
          autoComplete="email"
          placeholder={t('emailPlaceholder')}
        />
        <div className={styles.passwordGroup}>
          <TextField
            label={t('password')}
            type="password"
            value={form.values.password}
            onChange={(value) => change('password', value)}
            onBlur={() => form.blur('password')}
            error={fieldError('password')}
            autoComplete="new-password"
          />
          <PasswordChecklist value={form.values.password} />
        </div>
        <TextField
          label={t('signup.confirm')}
          type="password"
          value={form.values.confirm}
          onChange={(value) => change('confirm', value)}
          onBlur={() => form.blur('confirm')}
          error={fieldError('confirm')}
          autoComplete="new-password"
        />
        <Button
          type="submit"
          variant="primary"
          size="lg"
          block
          loading={pending === 'email'}
          disabled={pending !== null}
        >
          {t('signup.submit')}
        </Button>
      </form>

      <p className={styles.footer}>
        {t('signup.haveAccount')}
        <Link to={`/login${search}`} className={styles.link}>
          {t('signup.signIn')}
        </Link>
      </p>
    </>
  )
}
