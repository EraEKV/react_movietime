import { useLocation, useNavigate } from 'react-router'
import { useAuth } from '../../hooks/useAuth'
import { loginPath } from '../../utils/redirect'
import Avatar from '../Avatar/Avatar'
import ButtonLink from '../ButtonLink/ButtonLink'
import Menu from '../Menu/Menu'
import styles from './UserMenu.module.css'

/** Header corner: avatar menu for a signed-in user, "Sign in" for a guest. */
export default function UserMenu() {
  const { user, status, signOut } = useAuth()
  const { pathname, search } = useLocation()
  const navigate = useNavigate()

  // Nothing while the session is being restored: avoids a "Sign in" flash for signed-in users.
  if (status === 'loading') return <span className={styles.placeholder} aria-hidden="true" />

  if (!user) {
    return (
      <ButtonLink to={loginPath(pathname + search)} variant="primary">
        Sign in
      </ButtonLink>
    )
  }

  const name = user.displayName || user.email || 'Account'

  function handleSignOut() {
    // Leave first: on a protected page the guard would otherwise send us to /login.
    navigate('/')
    void signOut()
  }

  return (
    <Menu
      label={`Account: ${name}`}
      triggerClassName={styles.trigger}
      trigger={<Avatar name={name} photoUrl={user.photoURL} size={32} />}
      align="right"
      header={
        <>
          <p className={styles.name}>{name}</p>
          {user.email && <p className={styles.email}>{user.email}</p>}
        </>
      }
      items={[
        { label: 'Profile', icon: 'user', to: '/profile' },
        { label: 'Library', icon: 'bookmark', to: '/watchlist' },
        { kind: 'divider' },
        { label: 'Sign out', icon: 'logout', danger: true, onSelect: handleSignOut },
      ]}
    />
  )
}
