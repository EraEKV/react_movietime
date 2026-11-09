import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import Badge from '../shared/ui/Badge/Badge'
import Button from '../shared/ui/Button/Button'
import Card from '../shared/ui/Card/Card'
import CalendarSettings from '../components/Settings/CalendarSettings'
import PushSettings from '../components/Settings/PushSettings'
import ResendVerification from '../components/Settings/ResendVerification'
import RadioCards from '../shared/ui/RadioCards/RadioCards'
import SegmentedControl from '../shared/ui/SegmentedControl/SegmentedControl'
import DisplayNameForm from '../components/Settings/DisplayNameForm'
import ThemePreview from '../components/Settings/ThemePreview'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { languageChanged, selectLanguage } from '../store/preferencesSlice'
import { LANGUAGES } from '../shared/i18n/languages'
import { translatedOption } from '../shared/i18n'
import type { ThemePreference } from '../shared/types/preferences'
import styles from './SettingsPage.module.css'

const THEMES = [
  translatedOption<ThemePreference>('light', 'profile:settings.light'),
  translatedOption<ThemePreference>('dark', 'profile:settings.dark'),
  translatedOption<ThemePreference>('system', 'profile:settings.system'),
]

/**
 * /profile/settings. Theme and language apply at once and sync to the account (listener in
 * store/listeners.ts); the name is a form with an explicit Save, because it is shown to
 * other people.
 */
export default function SettingsPage() {
  const { t } = useTranslation('profile')
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
      <title>{t('settings.pageTitle')}</title>
      <h1 id="settings-title" className={styles.title}>
        {t('settings.title')}
      </h1>

      <Card as="section" aria-labelledby="account-title">
        <div className={styles.section}>
          <h2 id="account-title" className={styles.sectionTitle}>
            {t('settings.account')}
          </h2>
          {/* key: a new user (sign out → in as someone else) gets a fresh form. */}
          <DisplayNameForm key={user.uid} initialName={user.displayName ?? ''} />

          <div className={styles.emailRow}>
            <div className={styles.emailText}>
              <span className={styles.label}>{t('settings.email')}</span>
              <span className={styles.emailValue}>
                {user.email}
                {user.emailVerified ? (
                  <Badge tone="success" icon="check">
                    {t('verified')}
                  </Badge>
                ) : (
                  <Badge icon="alert">{t('notVerified')}</Badge>
                )}
              </span>
              {!user.emailVerified && (
                <span className={styles.note} role="status">
                  {verifyNote ?? t('settings.verifyNote')}
                </span>
              )}
            </div>
            {!user.emailVerified && (
              <ResendVerification
                size="md"
                label={t('settings.resendVerification')}
                onResult={(r) => setVerifyNote(r.ok ? t('settings.sent') : r.message)}
              />
            )}
          </div>
        </div>
      </Card>

      <Card as="section" aria-labelledby="appearance-title">
        <div className={styles.section}>
          <h2 id="appearance-title" className={styles.sectionTitle}>
            {t('settings.appearance')}
          </h2>
          <RadioCards
            legend={t('settings.theme')}
            columns={3}
            value={preference}
            onChange={setTheme}
            options={THEMES.map((theme) => ({
              value: theme.value,
              label: theme.label,
              preview: <ThemePreview theme={theme.value} />,
            }))}
          />
          <p className={styles.note}>{t('settings.themeNote')}</p>

          <div className={styles.field}>
            <span className={styles.label}>{t('settings.language')}</span>
            <SegmentedControl
              label={t('settings.language')}
              value={language}
              onChange={(next) => dispatch(languageChanged(next))}
              options={LANGUAGES.map(({ value, label }) => ({ value, label }))}
            />
            <p className={styles.note}>{t('settings.languageNote')}</p>
          </div>
        </div>
      </Card>

      <Card as="section" aria-labelledby="notifications-title">
        <div className={styles.section}>
          <h2 id="notifications-title" className={styles.sectionTitle}>
            {t('settings.notifications')}
          </h2>
          <PushSettings />
        </div>
      </Card>

      <CalendarSettings />

      <div className={styles.footer}>
        <span className={styles.version}>{t('settings.footer')}</span>
        <Button
          variant="danger"
          icon="logout"
          loading={pending === 'signOut'}
          onClick={handleSignOut}
        >
          {t('settings.signOut')}
        </Button>
      </div>
    </section>
  )
}
