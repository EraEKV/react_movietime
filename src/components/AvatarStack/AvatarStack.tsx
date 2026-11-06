import { useTranslation } from 'react-i18next'
import Avatar from '../Avatar/Avatar'
import styles from './AvatarStack.module.css'

interface AvatarStackProps {
  /** Display names; the first ones are drawn, the rest become "+N". */
  people: string[]
  max?: number
  size?: number
}

/** Overlapping avatars of the people on a shared list. One label names all of them. */
export default function AvatarStack({ people, max = 3, size = 28 }: AvatarStackProps) {
  const { t } = useTranslation()
  if (people.length === 0) return null
  const more = people.length - max
  return (
    <span
      className={styles.stack}
      role="img"
      aria-label={t('ui.people', {
        people: t('count.people', { count: people.length }),
        names: people.join(', '),
      })}
    >
      {/* aria-hidden: the stack's own label already lists everyone. */}
      <span className={styles.faces} aria-hidden="true">
        {people.slice(0, max).map((name, i) => (
          <Avatar key={`${name}-${i}`} name={name} size={size} />
        ))}
        {more > 0 && (
          <span className={styles.more} style={{ width: size, height: size }}>
            +{more}
          </span>
        )}
      </span>
    </span>
  )
}
