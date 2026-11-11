import { useTranslation } from 'react-i18next'
import { cx } from '../../shared/lib/cx'
import { relativeTime } from '../../shared/lib/relativeTime'
import Button from '../../shared/ui/Button/Button'
import ButtonLink from '../../shared/ui/ButtonLink/ButtonLink'
import type { AppNotification } from '../../types/notifications'
import styles from './Notifications.module.css'

interface NotificationItemProps {
  item: AppNotification
  /** App path of the list or plan. */
  to: string
  onOpen: () => void
  onMarkRead: () => void
  onDecline: () => void
}

/** One row: what happened, when, and the three actions. Unread rows carry a dot. */
export default function NotificationItem({
  item,
  to,
  onOpen,
  onMarkRead,
  onDecline,
}: NotificationItemProps) {
  const { t } = useTranslation('notifications')
  const shared = item.type === 'shared'
  const text = (n: AppNotification) => {
    const values = { name: n.fromName || '—', title: n.targetTitle }
    if (n.type === 'shared') return t(`shared.${n.collection}.${n.role}`, values)
    if (n.type === 'proposal') return t('suggestion.proposal', { ...values, film: n.film })
    return t(n.decision === 'accepted' ? 'suggestion.accepted' : 'suggestion.rejected', {
      ...values,
      film: n.film,
    })
  }
  return (
    <li className={cx(styles.item, !item.read && styles.unread)}>
      {!item.read && <span className={styles.dot} role="img" aria-label={t('unreadMark')} />}
      <div className={styles.body}>
        <p className={styles.text}>{text(item)}</p>
        <time className={styles.time} dateTime={item.createdAt}>
          {relativeTime(item.createdAt)}
        </time>
        <div className={styles.actions}>
          <ButtonLink to={to} variant="primary" size="sm" onClick={onOpen}>
            {t('open')}
          </ButtonLink>
          {!item.read && (
            <Button size="sm" variant="ghost" onClick={onMarkRead}>
              {t('markRead')}
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={onDecline}
            title={shared ? t('declineHint', { title: item.targetTitle }) : undefined}
          >
            {t(shared ? 'decline' : 'dismiss')}
          </Button>
        </div>
      </div>
    </li>
  )
}
