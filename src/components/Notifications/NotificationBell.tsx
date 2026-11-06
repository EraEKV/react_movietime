import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNotifications } from '../../hooks/useNotifications'
import { buttonClass } from '../../shared/ui/Button/variants'
import Button from '../../shared/ui/Button/Button'
import CounterBadge from '../../shared/ui/CounterBadge/CounterBadge'
import EmptyState from '../../shared/ui/EmptyState/EmptyState'
import Icon from '../../shared/ui/Icon/Icon'
import Popover from '../../shared/ui/Popover/Popover'
import { sharePath } from '../../utils/sharing'
import NotificationItem from './NotificationItem'
import styles from './Notifications.module.css'

/**
 * Header bell with an unread counter and the list of notifications ("X shared a list with
 * you"). Live via onSnapshot; loaded lazily and only for a verified email (see
 * useNotifications). Actions: open the list or plan, mark as read, decline (leave).
 */
export default function NotificationBell() {
  const { t } = useTranslation('notifications')
  const { status, items, unread, retry, markRead, markAllRead, decline } = useNotifications()
  const [error, setError] = useState<string | null>(null)

  /** A failed write shows one sentence in the panel; the snapshot shows every success. */
  function run(action: Promise<void>) {
    setError(null)
    action.catch(() => setError(navigator.onLine ? t('error') : t('offline')))
  }

  return (
    <Popover
      label={unread > 0 ? t('bellUnread', { count: unread }) : t('bell')}
      triggerClassName={buttonClass('ghost', 'md', { iconOnly: true })}
      trigger={
        <>
          <Icon name="bell" size={20} />
          <CounterBadge count={unread} />
        </>
      }
    >
      {(close) => (
        <div className={styles.panel}>
          <div className={styles.head}>
            <h2 className={styles.title}>{t('title')}</h2>
            {unread > 0 && (
              <Button size="sm" variant="ghost" onClick={() => run(markAllRead())}>
                {t('markAll')}
              </Button>
            )}
          </div>

          {status === 'error' ? (
            <div className={styles.state} role="alert">
              <p>{t('loadError')}</p>
              <Button size="sm" onClick={retry}>
                {t('retry')}
              </Button>
            </div>
          ) : items.length === 0 ? (
            status === 'success' && (
              <EmptyState icon="bell" title={t('empty')} body={t('emptyHint')} />
            )
          ) : (
            <ul className={styles.list}>
              {items.map((item) => (
                <NotificationItem
                  key={item.id}
                  item={item}
                  to={sharePath(item.collection, item.targetId)}
                  onOpen={() => {
                    if (!item.read) run(markRead(item.id))
                    close()
                  }}
                  onMarkRead={() => run(markRead(item.id))}
                  onDecline={() => run(decline(item))}
                />
              ))}
            </ul>
          )}
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </Popover>
  )
}
