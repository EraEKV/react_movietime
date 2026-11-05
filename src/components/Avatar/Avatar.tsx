import styles from './Avatar.module.css'

interface AvatarProps {
  name: string
  photoUrl?: string | null
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

/** Photo when there is one (Google sign-in), initials otherwise. */
export default function Avatar({ name, photoUrl, size = 32 }: AvatarProps) {
  return (
    <span
      className={styles.avatar}
      role="img"
      aria-label={name}
      title={name}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
    >
      {photoUrl ? <img src={photoUrl} alt="" referrerPolicy="no-referrer" /> : initials(name)}
    </span>
  )
}
