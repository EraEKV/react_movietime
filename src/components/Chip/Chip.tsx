import type { ReactNode } from 'react'
import { cx } from '../../utils/cx'
import type { IconName } from '../Icon/icons'
import Icon from '../Icon/Icon'
import styles from './Chip.module.css'

interface ChipProps {
  children: ReactNode
  icon?: IconName
  selected?: boolean
  tone?: 'tonight'
  /** With onClick the chip is a toggle button; without it, a plain label. */
  onClick?: () => void
}

export default function Chip({ children, icon, selected = false, tone, onClick }: ChipProps) {
  const className = cx(
    styles.chip,
    selected && styles.selected,
    tone === 'tonight' && styles.tonight,
  )
  const content = (
    <>
      {icon && <Icon name={icon} size={16} />}
      {children}
    </>
  )
  if (!onClick) return <span className={className}>{content}</span>
  return (
    <button type="button" className={className} aria-pressed={selected} onClick={onClick}>
      {content}
    </button>
  )
}
