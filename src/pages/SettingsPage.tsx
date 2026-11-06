import { useState } from 'react'
import { useNavigate } from 'react-router'
import Badge from '../components/Badge/Badge'
import Button from '../components/Button/Button'
import Card from '../components/Card/Card'
import ResendVerification from '../components/Settings/ResendVerification'
import RadioCards from '../components/RadioCards/RadioCards'
import SegmentedControl from '../components/SegmentedControl/SegmentedControl'
import DisplayNameForm from '../components/Settings/DisplayNameForm'
import ThemePreview from '../components/Settings/ThemePreview'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { languageChanged, selectLanguage } from '../store/preferencesSlice'
import type { Language, ThemePreference } from '../types/preferences'
import styles from './SettingsPage.module.css'

const THEMES: { value: ThemePreference; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
]

// Each language is named in itself, so a person who can't read the current one finds theirs.
const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'ru', label: 'Русский' },
  { value: 'kk', label: 'Қазақша' },
]

/**
 * /profile/settings. Theme and language apply at once and sync to the account (listener in
 * store/listeners.ts); the name is a form with an explicit Save, because it is shown to
 * other people.
 */
export default function SettingsPage() {
  const { user, pending, signOut } = useAuth()
  const { preference, setTheme } = useTheme()
  const language = useAppSelector(selectLanguage)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [verifyNote, setVerifyNote] = useState<string | null>(null)

  if (!user) return null // ProtectedRoute guarantees a user here.

  function handleSignOut() {
    // Leave first: on a protected page the guard would otherwise send us to /login.
    navigate('/')
    void signOut()
  }

  return (
    <section className={styles.page} aria-labelledby="settings-title">
      <title>Settings · Movietime</title>
      <h1 id="settings-title" className={styles.title}>
        Settings
      </h1>

      <Card as="section" aria-labelledby="account-title">
        <div className={styles.section}>
          <h2 id="account-title" className={styles.sectionTitle}>
            Account
          </h2>
          {/* key: a new user (sign out → in as someone else) gets a fresh form. */}
          <DisplayNameForm key={user.uid} initialName={user.displayName ?? ''} />

          <div className={styles.emailRow}>
            <div className={styles.emailText}>
              <span className={styles.label}>Email</span>
              <span className={styles.emailValue}>
                {user.email}
                {user.emailVerified ? (
                  <Badge tone="success" icon="check">
                    Verified
                  </Badge>
                ) : (
                  <Badge icon="alert">Not verified</Badge>
                )}
              </span>
              {!user.emailVerified && (
                <span className={styles.note} role="status">
                  {verifyNote ?? 'Verify it to share lists and plans with friends.'}
                </span>
              )}
            </div>
            {!user.emailVerified && (
              <ResendVerification
                size="md"
                label="Resend verification"
                onResult={(r) =>
                  setVerifyNote(r.ok ? 'Sent. Check your inbox and the spam folder.' : r.message)
                }
              />
            )}
          </div>
        </div>
      </Card>

      <Card as="section" aria-labelledby="appearance-title">
        <div className={styles.section}>
          <h2 id="appearance-title" className={styles.sectionTitle}>
            Appearance
          </h2>
          <RadioCards
            legend="Theme"
            columns={3}
            value={preference}
            onChange={setTheme}
            options={THEMES.map((t) => ({ ...t, preview: <ThemePreview theme={t.value} /> }))}
          />
          <p className={styles.note}>
            Saved to your account, so your other devices follow. System matches this device.
          </p>

          <div className={styles.field}>
            <span className={styles.label}>Language</span>
            <SegmentedControl
              label="Language"
              value={language}
              onChange={(next) => dispatch(languageChanged(next))}
              options={LANGUAGES}
            />
            <p className={styles.note}>
              Your choice is saved now. Translations of the interface are coming in the next update;
              until then Movietime stays in English.
            </p>
          </div>
        </div>
      </Card>

      <div className={styles.footer}>
        <span className={styles.version}>Movietime · Data from TMDB</span>
        <Button
          variant="danger"
          icon="logout"
          loading={pending === 'signOut'}
          onClick={handleSignOut}
        >
          Sign out
        </Button>
      </div>
    </section>
  )
}
