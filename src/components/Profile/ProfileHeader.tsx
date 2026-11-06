import { useMediaQuery } from '../../hooks/useMediaQuery'
import type { AuthUser, UserProfile } from '../../types/auth'
import Avatar from '../Avatar/Avatar'
import Badge from '../Badge/Badge'
import ButtonLink from '../ButtonLink/ButtonLink'
import Skeleton from '../Skeleton/Skeleton'
import styles from './Profile.module.css'

const PROVIDER_LABELS: Record<string, string> = {
  password: 'email and password',
  'google.com': 'Google',
}

const memberSince = (iso: string) =>
  new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date(iso))

interface ProfileHeaderProps {
  user: AuthUser
  profile: UserProfile | null
  loading: boolean
}

/**
 * Who you are: avatar, name, email with its verification state, sign-in method, join date.
 * An unverified email gets the app-wide verify banner from Layout (with Resend), so the
 * profile only shows the badge.
 */
export default function ProfileHeader({ user, profile, loading }: ProfileHeaderProps) {
  const wide = useMediaQuery('(min-width: 768px)')
  const name = profile?.displayName || user.displayName || user.email || 'Movie fan'
  // providerData of the signed-in user: the methods this account can actually sign in with.
  const methods = user.providers.map((p) => PROVIDER_LABELS[p] ?? p)

  return (
    <>
      <header className={styles.header}>
        <Avatar name={name} photoUrl={user.photoURL} size={wide ? 96 : 72} />
        <div className={styles.identity}>
          <h1 id="profile-title" className={styles.name}>
            {name}
          </h1>
          <p className={styles.email}>
            <span>{user.email}</span>
            {user.emailVerified ? (
              <Badge tone="success" icon="check">
                Verified
              </Badge>
            ) : (
              <Badge icon="alert">Not verified</Badge>
            )}
          </p>
          {/* A div: the loading skeleton is a block element, not allowed inside <p>. */}
          <div className={styles.meta}>
            {methods.length > 0 && <span>Signed in with {methods.join(' and ')}</span>}
            <span>
              {loading ? (
                <Skeleton width={150} height={14} />
              ) : profile?.createdAt ? (
                `Member since ${memberSince(profile.createdAt)}`
              ) : null}
            </span>
          </div>
        </div>
        <ButtonLink to="/profile/settings" icon="settings" className={styles.settingsLink}>
          Settings
        </ButtonLink>
      </header>
    </>
  )
}
