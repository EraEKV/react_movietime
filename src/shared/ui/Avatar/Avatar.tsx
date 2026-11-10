import { avatarFill, avatarRing } from '../../lib/avatarStyle'
import type { UserAvatar } from '../../types/avatar'
import styles from './Avatar.module.css'

interface AvatarProps {
  name: string
  photoUrl?: string | null
  /** The avatar the user chose in settings; it wins over the provider photo. */
  avatar?: UserAvatar | null
  size?: number
}

function initials(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0))
    .join('')
  return letters.slice(0, 2).toUpperCase() || '?'
}

/** The chosen photo or emoji, else the Google photo, else initials. */
export default function Avatar({ name, photoUrl, avatar, size = 32 }: AvatarProps) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.38) }
  if (avatar?.kind === 'emoji') {
    return (
      <span
        className={styles.avatar}
        role="img"
        aria-label={name}
        title={name}
        style={{
          ...style,
          fontSize: Math.round(size * 0.52),
          background: avatarFill(avatar.color),
          boxShadow: `inset 0 0 0 1.5px ${avatarRing(avatar.color)}`,
        }}
      >
        <span aria-hidden="true">{avatar.emoji}</span>
      </span>
    )
  }
  const src = avatar?.kind === 'photo' ? avatar.photo : photoUrl
  return (
    <span className={styles.avatar} role="img" aria-label={name} title={name} style={style}>
      {src ? <img src={src} alt="" referrerPolicy="no-referrer" /> : initials(name)}
    </span>
  )
}
