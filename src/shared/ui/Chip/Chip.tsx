import { Link } from 'react-router'
import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'
import type { IconName } from '../Icon/icons'
import Icon from '../Icon/Icon'
import styles from './Chip.module.css'

interface ChipProps {
  children: ReactNode
  icon?: IconName
  selected?: boolean
  tone?: 'tonight' | 'onImage'
  /** With onClick the chip is a toggle button; without it, a plain label. */
  onClick?: () => void
  /** With `to` the chip is a link (header "Tonight"). */
  to?: string
  'aria-label'?: string
}

export default function Chip({
  children,
  icon,
  selected = false,
  tone,
  onClick,
  to,
  'aria-label': ariaLabel,
}: ChipProps) {
  const className = cx(
    styles.chip,
    selected && styles.selected,
    tone === 'tonight' && styles.tonight,
    tone === 'onImage' && styles.onImage,
  )
  const content = (
    <>
      {icon && <Icon name={icon} size={16} />}
      {children}
    </>
  )
  if (to) {
    return (
      <Link to={to} className={cx(className, styles.link)} aria-label={ariaLabel}>
        {content}
      </Link>
    )
  }
  if (!onClick) return <span className={className}>{content}</span>
  return (
    <button type="button" className={className} aria-pressed={selected} onClick={onClick}>
      {content}
    </button>
  )
}
