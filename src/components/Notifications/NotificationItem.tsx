import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { cx } from '../../shared/lib/cx'
import { relativeTime } from '../../shared/lib/relativeTime'
import Button from '../../shared/ui/Button/Button'
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
  return (
    <li className={cx(styles.item, !item.read && styles.unread)}>
      {!item.read && <span className={styles.dot} role="img" aria-label={t('unreadMark')} />}
      <div className={styles.body}>
        <p className={styles.text}>
          {t(`shared.${item.collection}.${item.role}`, {
            name: item.fromName || '—',
            title: item.targetTitle,
          })}
        </p>
        <time className={styles.time} dateTime={item.createdAt}>
          {relativeTime(item.createdAt)}
        </time>
        <div className={styles.actions}>
          <Link to={to} className={styles.open} onClick={onOpen}>
            {t('open')}
          </Link>
          {!item.read && (
            <Button size="sm" variant="ghost" onClick={onMarkRead}>
              {t('markRead')}
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={onDecline}
            title={t('declineHint', { title: item.targetTitle })}
          >
            {t('decline')}
          </Button>
        </div>
      </div>
    </li>
  )
}
