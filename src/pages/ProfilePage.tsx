import Banner from '../components/Banner/Banner'
import ErrorState from '../components/EmptyState/ErrorState'
import ActivityFeed from '../components/Profile/ActivityFeed'
import ProfileCounters from '../components/Profile/ProfileCounters'
import ProfileHeader from '../components/Profile/ProfileHeader'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { errorMessage } from '../utils/firebaseErrors'
import styles from './ProfilePage.module.css'

/** /profile — who you are, your numbers and what you did lately. Signed-in users only. */
export default function ProfilePage() {
  // ProtectedRoute guarantees a user here.
  const { user } = useAuth()
  const { status, profile, error } = useProfile(user?.uid ?? null)

  if (!user) return null

  return (
    <section className={styles.page} aria-labelledby="profile-title">
      <title>Profile · Movietime</title>

      <ProfileHeader user={user} profile={profile} loading={status === 'loading'} />

      {status === 'error' && (
        <ErrorState
          headingLevel="h2"
          title="Couldn’t load your profile"
          body={errorMessage(error)}
        />
      )}
      {status === 'success' && !profile && (
        <Banner>Your profile is being created. Sign out and in again if this stays.</Banner>
      )}

      <ProfileCounters />
      <ActivityFeed />
    </section>
  )
}
