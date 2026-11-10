import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useProfile } from '../../hooks/useProfile'
import { useTimedState } from '../../shared/hooks/useTimedState'
import Banner from '../../shared/ui/Banner/Banner'
import Button from '../../shared/ui/Button/Button'
import TextField from '../../shared/ui/TextField/TextField'
import {
  removeCalendarFeed,
  renewCalendarFeed,
  syncCalendarZone,
} from '../../services/profileService'
import { localTimeZone } from '../../utils/calendar'
import { feedUrl } from '../../utils/calendarFeed'
import { offlineMessage } from '../../utils/listErrors'
import styles from '../../pages/SettingsPage.module.css'

type Busy = 'create' | 'renew' | 'remove'

/**
 * The calendar subscription: one link with every session of every plan, to paste into Google
 * Calendar ("From URL") or any calendar app. The secret lives in the user's profile; making
 * a new link cancels the old one, and turning it off removes it.
 */
export default function CalendarFeed({ uid }: { uid: string }) {
  const { t } = useTranslation('profile', { keyPrefix: 'settings.calendar' })
  const { status, profile } = useProfile(uid)
  const token = profile?.icsToken ?? null
  const zone = profile?.icsTimeZone ?? null
  const [busy, setBusy] = useState<Busy | null>(null)
  const [confirm, setConfirm] = useState<'renew' | 'remove' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, showCopied] = useTimedState<'copied' | 'manual'>(2500)
  const fieldRef = useRef<HTMLInputElement>(null)

  // The feed writes the sessions in the zone saved with the link: follow the device.
  useEffect(() => {
    if (token && zone !== localTimeZone() && navigator.onLine) {
      void syncCalendarZone(uid).catch(() => {})
    }
  }, [uid, token, zone])

  if (status === 'loading' || !profile) return null

  async function run(action: Busy, work: () => Promise<unknown>) {
    if (!navigator.onLine) return setError(offlineMessage())
    setBusy(action)
    setError(null)
    try {
      await work()
      setConfirm(null)
    } catch {
      setError(t('failed'))
    } finally {
      setBusy(null)
    }
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url)
      showCopied('copied')
    } catch {
      fieldRef.current?.select()
      showCopied('manual')
    }
  }

  if (!token) {
    return (
      <div className={styles.field}>
        <p className={styles.note}>{t('intro')}</p>
        <div className={styles.actions}>
          <Button
            variant="primary"
            icon="calendar"
            loading={busy === 'create'}
            onClick={() => void run('create', () => renewCalendarFeed(uid))}
          >
            {t('create')}
          </Button>
        </div>
        {error && (
          <Banner tone="warning" icon="alert">
            {error}
          </Banner>
        )}
      </div>
    )
  }

  const url = feedUrl(window.location.origin, token)
  return (
    <div className={styles.field}>
      <p className={styles.note}>{t('intro')}</p>
      <div className={styles.copyRow}>
        <TextField
          ref={fieldRef}
          label={t('link')}
          hideLabel
          icon="link"
          value={url}
          onChange={() => {}}
          readOnly
          onFocus={(event) => event.currentTarget.select()}
          hint={copied === 'manual' ? t('manual') : undefined}
        />
        <Button icon={copied === 'copied' ? 'check' : 'copy'} onClick={() => void copy(url)}>
          {copied === 'copied' ? t('copied') : t('copy')}
        </Button>
      </div>
      <ol className={styles.steps}>
        <li>{t('step1')}</li>
        <li>{t('step2')}</li>
        <li>{t('step3')}</li>
      </ol>
      <p className={styles.note}>{t('refresh')}</p>
      <p className={styles.note}>{t('private')}</p>
      {zone && <p className={styles.note}>{t('zone', { zone })}</p>}

      {confirm ? (
        <Banner tone="warning" icon="alert">
          <p className={styles.confirmText}>
            {t(confirm === 'renew' ? 'renewWarning' : 'removeWarning')}
          </p>
          <div className={styles.actions}>
            <Button
              variant="danger"
              loading={busy === 'renew' || busy === 'remove'}
              onClick={() =>
                void run(confirm, () =>
                  confirm === 'renew' ? renewCalendarFeed(uid) : removeCalendarFeed(uid),
                )
              }
            >
              {t(confirm === 'renew' ? 'renewConfirm' : 'removeConfirm')}
            </Button>
            <Button variant="ghost" disabled={busy !== null} onClick={() => setConfirm(null)}>
              {t('cancel')}
            </Button>
          </div>
        </Banner>
      ) : (
        <div className={styles.actions}>
          <Button icon="refresh" onClick={() => setConfirm('renew')}>
            {t('renew')}
          </Button>
          <Button variant="ghost" onClick={() => setConfirm('remove')}>
            {t('remove')}
          </Button>
        </div>
      )}
      {error && (
        <Banner tone="warning" icon="alert">
          {error}
        </Banner>
      )}
      <span className="sr-only" aria-live="polite">
        {copied === 'copied' ? t('copied') : ''}
      </span>
    </div>
  )
}
