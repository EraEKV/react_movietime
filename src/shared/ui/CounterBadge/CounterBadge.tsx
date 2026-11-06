import styles from './CounterBadge.module.css'

interface CounterBadgeProps {
  count: number
  /** Larger numbers are shown as "99+". */
  max?: number
}

/**
 * A small number on the corner of an icon button (unread count). Hidden at 0. It is
 * decorative: the button's own accessible name must carry the count for screen readers.
 */
export default function CounterBadge({ count, max = 99 }: CounterBadgeProps) {
  if (count <= 0) return null
  return (
    <span className={styles.badge} aria-hidden="true">
      {count > max ? `${max}+` : count}
    </span>
  )
}
