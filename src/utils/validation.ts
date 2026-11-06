// Pure form validators: each returns an error message, or null when the value is fine.
// The UI decides when to show them (on blur and on submit).

// Practical check, not RFC 5322: something@something.tld without spaces.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function validateEmail(value: string): string | null {
  const email = value.trim()
  if (!email) return 'Enter your email.'
  if (!EMAIL_PATTERN.test(email)) return 'Enter an email like name@example.com.'
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
    { id: 'length', label: '8+ characters', met: value.length >= 8 },
    { id: 'digit', label: 'A number', met: /\d/.test(value) },
    { id: 'special', label: 'A special character', met: /[^A-Za-z0-9]/.test(value) },
  ]
}

export function validateNewPassword(value: string): string | null {
  if (!value) return 'Create a password.'
  if (passwordRules(value).some((rule) => !rule.met)) {
    return 'Use 8+ characters with a number and a special character.'
  }
  return null
}

/** Sign-in only checks presence: the rules may have changed since the account was made. */
export function validatePassword(value: string): string | null {
  return value ? null : 'Enter your password.'
}

export function validatePasswordConfirm(password: string, confirm: string): string | null {
  if (!confirm) return 'Repeat the password.'
  return confirm === password ? null : 'Passwords don’t match.'
}

export const DISPLAY_NAME_MIN = 2
export const DISPLAY_NAME_MAX = 40

export function validateDisplayName(value: string): string | null {
  const name = value.trim()
  if (name.length < DISPLAY_NAME_MIN) return `Use at least ${DISPLAY_NAME_MIN} characters.`
  if (name.length > DISPLAY_NAME_MAX) return `Use at most ${DISPLAY_NAME_MAX} characters.`
  return null
}
