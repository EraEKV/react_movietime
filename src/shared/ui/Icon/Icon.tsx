import { cx } from '../../lib/cx'
import { FILLED_ICONS, ICON_PATHS, type IconName } from './icons'
import styles from './Icon.module.css'

interface IconProps {
  name: IconName
  size?: number
  /** Only for icons that carry meaning on their own; decorative icons stay hidden from screen readers. */
  label?: string
  className?: string
}

/** Icons inherit currentColor, so they follow the text colour of whatever contains them. */
export default function Icon({ name, size = 20, label, className }: IconProps) {
  const filled = FILLED_ICONS.has(name)
  return (
    <svg
      className={cx(styles.icon, className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <path d={ICON_PATHS[name]} />
    </svg>
  )
}
