import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'
import type { IconName } from '../Icon/icons'
import Icon from '../Icon/Icon'
import styles from './Banner.module.css'

type Tone = 'info' | 'warning' | 'offline'

const DEFAULT_ICON: Record<Tone, IconName> = { info: 'info', warning: 'alert', offline: 'wifi-off' }

interface BannerProps {
  tone?: Tone
  icon?: IconName
  children: ReactNode
  action?: ReactNode
}

/** Inline notice above content: search-mode explanation, offline, verify email, guest mode. */
export default function Banner({ tone = 'info', icon, children, action }: BannerProps) {
  return (
    <div
      className={cx(styles.banner, tone === 'info' ? styles.info : styles.warning)}
      role={tone === 'offline' ? 'status' : undefined}
    >
      <Icon name={icon ?? DEFAULT_ICON[tone]} size={18} />
      <span className={styles.message}>{children}</span>
      {action}
    </div>
  )
}
