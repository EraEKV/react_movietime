import { currentLocale } from '../../shared/i18n'
import { formatDateWith } from '../../shared/i18n/intl'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { useActivity } from '../../hooks/useActivity'
import { describeActivity } from '../../utils/activity'
import { errorMessage } from '../../utils/firebaseErrors'
import { relativeTime } from '../../shared/lib/relativeTime'
import ButtonLink from '../../shared/ui/ButtonLink/ButtonLink'
import EmptyState from '../../shared/ui/EmptyState/EmptyState'
import ErrorState from '../../shared/ui/EmptyState/ErrorState'
import Icon from '../../shared/ui/Icon/Icon'
import SectionHeader from '../../shared/ui/SectionHeader/SectionHeader'
import Skeleton from '../../shared/ui/Skeleton/Skeleton'
import styles from './Profile.module.css'

const fullDate = (iso: string) =>
  formatDateWith(new Date(iso), { dateStyle: 'medium', timeStyle: 'short' }, currentLocale())

function FeedSkeleton() {
  return (
    <ul className={styles.feed} aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <li key={i} className={styles.row}>
          <Skeleton width={36} height={36} radius="pill" />
          <Skeleton width={`${70 - i * 8}%`} height={16} />
        </li>
      ))}
    </ul>
  )
}

/** The newest 20 things you did: added, moved, created, watched. Live from Firestore. */
export default function ActivityFeed() {
  const { t } = useTranslation('profile')
  const { status, data, error, retry } = useActivity()
  // One "now" per render, so every row is measured against the same moment.
  const now = new Date()

  return (
    <section
      className={styles.activity}
      aria-labelledby="activity-title"
      aria-busy={status === 'loading'}
    >
      <SectionHeader id="activity-title" title={t('activity.title')} />

      {(status === 'loading' || status === 'idle') && <FeedSkeleton />}

      {status === 'error' && (
        <ErrorState
          headingLevel="h3"
          title={t('activity.error')}
          body={errorMessage(error)}
          onRetry={retry}
        />
      )}

      {status === 'success' && data.length === 0 && (
        <EmptyState
          headingLevel="h3"
          icon="clock"
          title={t('activity.emptyTitle')}
          body={t('activity.emptyBody')}
          actions={
            <ButtonLink to="/series" variant="primary" icon="compass">
              {t('activity.find')}
            </ButtonLink>
          }
        />
      )}

      {status === 'success' && data.length > 0 && (
        <ul className={styles.feed}>
          {data.map((item) => {
            const text = describeActivity(item)
            return (
              <li key={item.id} className={styles.row}>
                <span className={styles.rowIcon} aria-hidden="true">
                  <Icon name={text.icon} size={18} />
                </span>
                <span className={styles.rowText}>
                  {text.before}{' '}
                  {text.href ? (
                    <Link to={text.href} className={styles.rowLink}>
                      {text.title}
                    </Link>
                  ) : (
                    <strong>{text.title}</strong>
                  )}
                  {text.after && <span className={styles.rowAfter}> {text.after}</span>}
                </span>
                <time
                  className={styles.rowTime}
                  dateTime={item.createdAt}
                  title={fullDate(item.createdAt)}
                >
                  {relativeTime(item.createdAt, now)}
                </time>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
