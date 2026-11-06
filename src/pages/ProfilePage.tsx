import { useTranslation } from 'react-i18next'
import Banner from '../shared/ui/Banner/Banner'
import ErrorState from '../shared/ui/EmptyState/ErrorState'
import ActivityFeed from '../components/Profile/ActivityFeed'
import ProfileCounters from '../components/Profile/ProfileCounters'
import ProfileHeader from '../components/Profile/ProfileHeader'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { errorMessage } from '../utils/firebaseErrors'
import styles from './ProfilePage.module.css'

/** /profile — who you are, your numbers and what you did lately. Signed-in users only. */
export default function ProfilePage() {
  const { t } = useTranslation('profile')
  // ProtectedRoute guarantees a user here.
  const { user } = useAuth()
  const { status, profile, error } = useProfile(user?.uid ?? null)

  if (!user) return null

  return (
    <section className={styles.page} aria-labelledby="profile-title">
      <title>{t('pageTitle')}</title>

      <ProfileHeader user={user} profile={profile} loading={status === 'loading'} />

      {status === 'error' && (
        <ErrorState headingLevel="h2" title={t('loadError')} body={errorMessage(error)} />
      )}
      {status === 'success' && !profile && <Banner>{t('creating')}</Banner>}

      <ProfileCounters />
      <ActivityFeed />
    </section>
  )
}
