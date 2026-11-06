import Avatar from '../components/Avatar/Avatar'
import Badge from '../components/Badge/Badge'
import Banner from '../components/Banner/Banner'
import ErrorState from '../components/EmptyState/ErrorState'
import Skeleton from '../components/Skeleton/Skeleton'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { formatDate } from '../utils/format'
import { toAuthError } from '../utils/firebaseErrors'
import styles from './ProfilePage.module.css'

const PROVIDER_LABELS: Record<string, string> = {
  password: 'Email and password',
  'google.com': 'Google',
}

/** Account basics. Counters and the activity feed arrive with the profile phase. */
export default function ProfilePage() {
  // ProtectedRoute guarantees a user here.
  const { user } = useAuth()
  const { status, profile, error } = useProfile(user?.uid ?? null)

  if (!user) return null
  const name = profile?.displayName || user.displayName || user.email || 'Movie fan'
  const providers = (profile?.providers ?? user.providers).map((p) => PROVIDER_LABELS[p] ?? p)

  return (
    <section className={styles.page} aria-labelledby="profile-title">
      <title>Profile · Movietime</title>

      <div className={styles.card}>
        <Avatar name={name} photoUrl={user.photoURL} size={72} />
        <div className={styles.info}>
          <h1 id="profile-title" className={styles.name}>
            {name}
          </h1>
          <p className={styles.email}>
            {user.email}
            {user.emailVerified && (
              <Badge tone="success" icon="check">
                Verified
              </Badge>
            )}
          </p>
        </div>
      </div>

      {status === 'error' && (
        <ErrorState
          headingLevel="h2"
          title="Couldn’t load your profile"
          body={toAuthError(error).message}
        />
      )}

      {status !== 'error' && (
        <dl className={styles.details}>
          <div>
            <dt className={styles.term}>Sign-in method</dt>
            <dd>{providers.join(', ')}</dd>
          </div>
          <div>
            <dt className={styles.term}>Member since</dt>
            <dd>
              {status === 'loading' ? (
                <Skeleton width={120} />
              ) : (
                (formatDate(profile?.createdAt) ?? '—')
              )}
            </dd>
          </div>
        </dl>
      )}

      {status === 'success' && !profile && (
        <Banner>Your profile is being created. Sign out and in again if this stays.</Banner>
      )}
    </section>
  )
}
