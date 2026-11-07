import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTimedState } from '../../shared/hooks/useTimedState'
import Button from '../../shared/ui/Button/Button'
import { buttonClass } from '../../shared/ui/Button/variants'
import TextField from '../../shared/ui/TextField/TextField'
import { inviteMailto } from '../../utils/invite'
import styles from './ShareDialog.module.css'

interface InviteLinkProps {
  email: string
  url: string
  /** Name of the list or plan. */
  name: string
  ownerName: string
  onDismiss: () => void
  /** Sends the invite by email from the server; omit to hide the button. */
  onSend?: () => Promise<void>
}

/**
 * For a person who may not have an account: the invite link (copy, the phone's share
 * sheet, or a prefilled email). Sending is left to the owner on purpose: there is no mail
 * server, and the app never checks whether the address belongs to an account.
 */
export default function InviteLink({
  email,
  url,
  name,
  ownerName,
  onDismiss,
  onSend,
}: InviteLinkProps) {
  const { t } = useTranslation('sharing', { keyPrefix: 'inviteLink' })
  const [copied, showCopied] = useTimedState<'copied' | 'manual'>(2500)
  const fieldRef = useRef<HTMLInputElement>(null)
  const values = { email, name, owner: ownerName || 'A friend', url }
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<'sent' | 'failed' | null>(null)
  const canShare = typeof navigator.share === 'function'

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
      showCopied('copied')
    } catch {
      fieldRef.current?.select()
      showCopied('manual')
    }
  }

  async function handleSend() {
    if (!onSend) return
    setSending(true)
    setSendResult(null)
    try {
      await onSend()
      setSendResult('sent')
    } catch {
      setSendResult('failed')
    } finally {
      setSending(false)
    }
  }

  async function handleShare() {
    try {
      await navigator.share({ title: name, text: t('shareText', values), url })
    } catch {
      // Closing the share sheet rejects with AbortError: nothing to report.
    }
  }

  return (
    <section className={styles.inviteLink} aria-label={t('title', values)}>
      <h3 className={styles.peopleTitle}>{t('title', values)}</h3>
      <p className={styles.note}>{t('hint', values)}</p>
      <div className={styles.copyRow}>
        <TextField
          ref={fieldRef}
          label={t('title', values)}
          hideLabel
          icon="link"
          value={url}
          onChange={() => {}}
          readOnly
          onFocus={(e) => e.currentTarget.select()}
          hint={copied === 'manual' ? t('manual') : undefined}
        />
        <Button icon={copied === 'copied' ? 'check' : 'copy'} onClick={() => void handleCopy()}>
          {copied === 'copied' ? t('copied') : t('copy')}
        </Button>
      </div>
      {sendResult === 'failed' && (
        <p className={styles.note} role="alert">
          {t('sendFailed')}
        </p>
      )}
      <div className={styles.inviteActions}>
        {onSend && (
          <Button
            variant="primary"
            icon={sendResult === 'sent' ? 'check' : undefined}
            loading={sending}
            onClick={() => void handleSend()}
          >
            {sendResult === 'sent' ? t('sent') : t('send')}
          </Button>
        )}
        {canShare && (
          <Button icon="share" onClick={() => void handleShare()}>
            {t('share')}
          </Button>
        )}
        <a
          className={buttonClass('secondary', 'md')}
          href={inviteMailto(email, t('mailSubject', values), t('mailBody', values))}
        >
          {t('email')}
        </a>
        <Button variant="ghost" onClick={onDismiss}>
          {t('dismiss')}
        </Button>
      </div>
      <span className="sr-only" aria-live="polite">
        {sendResult === 'sent' ? t('sent') : copied === 'copied' ? t('copied') : ''}
      </span>
    </section>
  )
}
