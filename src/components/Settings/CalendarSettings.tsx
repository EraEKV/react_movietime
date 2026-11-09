import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import Banner from '../../shared/ui/Banner/Banner'
import Button from '../../shared/ui/Button/Button'
import Card from '../../shared/ui/Card/Card'
import Dialog from '../../shared/ui/Dialog/Dialog'
import { useCalendar } from '../../hooks/useCalendar'
import styles from '../../pages/SettingsPage.module.css'

const RESULTS = ['connected', 'denied', 'error'] as const
type Result = (typeof RESULTS)[number]

/**
 * One-way copy of the Planner to Google Calendar. Hidden while the server isn't set up for
 * it. Google sends the person back here with ?calendar=connected | denied | error.
 */
export default function CalendarSettings() {
  const { t, i18n } = useTranslation('profile', { keyPrefix: 'settings.calendar' })
  const { t: tc } = useTranslation()
  const { status, busy, failed, connect, sync, disconnect } = useCalendar()
  const [params, setParams] = useSearchParams()
  const [confirming, setConfirming] = useState(false)
  // The outcome is read once on arrival; the address is cleaned below so a reload doesn't repeat it.
  const [result] = useState<Result | null>(() => {
    const value = params.get('calendar')
    return (RESULTS as readonly string[]).includes(value ?? '') ? (value as Result) : null
  })

  useEffect(() => {
    if (!params.has('calendar')) return
    const next = new URLSearchParams(params)
    next.delete('calendar')
    setParams(next, { replace: true })
  }, [params, setParams])

  if (!status || status.state === 'unavailable') return null
  const connected = status.state === 'connected'
  const revoked = connected && status.revoked

  return (
    <Card as="section" aria-labelledby="calendar-title">
      <div className={styles.section}>
        <h2 id="calendar-title" className={styles.sectionTitle}>
          {t('title')}
        </h2>
        <p className={styles.note}>{t('hint')}</p>

        {result && (
          <Banner tone={result === 'connected' ? 'info' : 'warning'}>
            {t(`result.${result}`)}
          </Banner>
        )}
        {revoked && <Banner tone="warning">{t('revoked')}</Banner>}
        {failed && <Banner tone="warning">{t('failed')}</Banner>}

        {connected && !revoked && (
          <p className={styles.note} role="status">
            {status.lastSyncAt
              ? t('lastSync', {
                  time: new Date(status.lastSyncAt).toLocaleString(i18n.language, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }),
                })
              : t('neverSynced')}
          </p>
        )}

        <div className={styles.field}>
          {connected && !revoked ? (
            <div className={styles.actions}>
              <Button
                icon="calendar"
                loading={busy === 'sync'}
                disabled={busy !== null}
                onClick={() => void sync()}
              >
                {t('syncNow')}
              </Button>
              <Button variant="ghost" disabled={busy !== null} onClick={() => setConfirming(true)}>
                {t('disconnect')}
              </Button>
            </div>
          ) : (
            <Button
              variant="primary"
              icon="calendar"
              loading={busy === 'connect'}
              disabled={busy !== null}
              onClick={() => void connect()}
            >
              {revoked ? t('reconnect') : t('connect')}
            </Button>
          )}
        </div>
      </div>

      {confirming && (
        <Dialog
          open
          onClose={() => setConfirming(false)}
          title={t('confirm.title')}
          footer={
            <>
              <Button variant="ghost" onClick={() => setConfirming(false)}>
                {tc('actions.cancel')}
              </Button>
              <Button
                variant="danger"
                loading={busy === 'disconnect'}
                onClick={() => void disconnect().then(() => setConfirming(false))}
              >
                {t('disconnect')}
              </Button>
            </>
          }
        >
          <p>{t('confirm.text')}</p>
        </Dialog>
      )}
    </Card>
  )
}
