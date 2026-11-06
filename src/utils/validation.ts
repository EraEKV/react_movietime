import i18n from '../shared/i18n'

// Form validators: each returns an error message (in the interface language), or null when
// the value is fine.
// The UI decides when to show them (on blur and on submit).

// Practical check, not RFC 5322: something@something.tld without spaces.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function validateEmail(value: string): string | null {
  const email = value.trim()
  if (!email) return i18n.t('validation.emailRequired')
  if (!EMAIL_PATTERN.test(email)) return i18n.t('errors.invalidEmail')
  return null
}

export interface PasswordRule {
  id: 'length' | 'digit' | 'special'
  label: string
  met: boolean
}

/** Per-rule results, so the signup form can show a live checklist while typing. */
export function passwordRules(value: string): PasswordRule[] {
  return [
    { id: 'length', label: i18n.t('validation.ruleLength'), met: value.length >= 8 },
    { id: 'digit', label: i18n.t('validation.ruleDigit'), met: /\d/.test(value) },
    { id: 'special', label: i18n.t('validation.ruleSpecial'), met: /[^A-Za-z0-9]/.test(value) },
  ]
}

export function validateNewPassword(value: string): string | null {
  if (!value) return i18n.t('validation.passwordCreate')
  if (passwordRules(value).some((rule) => !rule.met)) {
    return i18n.t('errors.weakPassword')
  }
  return null
}

/** Sign-in only checks presence: the rules may have changed since the account was made. */
export function validatePassword(value: string): string | null {
  return value ? null : i18n.t('validation.passwordRequired')
}

export function validatePasswordConfirm(password: string, confirm: string): string | null {
  if (!confirm) return i18n.t('validation.passwordRepeat')
  return confirm === password ? null : i18n.t('validation.passwordMismatch')
}

export const DISPLAY_NAME_MIN = 2
export const DISPLAY_NAME_MAX = 40

export function validateDisplayName(value: string): string | null {
  const name = value.trim()
  if (name.length < DISPLAY_NAME_MIN)
    return i18n.t('validation.atLeast', { count: DISPLAY_NAME_MIN })
  if (name.length > DISPLAY_NAME_MAX)
    return i18n.t('validation.atMost', { count: DISPLAY_NAME_MAX })
  return null
}
