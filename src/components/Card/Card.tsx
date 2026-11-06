import type { ElementType, ReactNode } from 'react'
import { cx } from '../../utils/cx'
import styles from './Card.module.css'

interface CardProps {
  /** Semantic element: 'section', 'article', 'li'… */
  as?: ElementType
  padded?: boolean
  className?: string
  children: ReactNode
  /** For a `section` card: the id of its heading (gives the region an accessible name). */
  'aria-labelledby'?: string
}

export default function Card({
  as: Tag = 'div',
  padded = true,
  className,
  children,
  'aria-labelledby': labelledBy,
}: CardProps) {
  return (
    <Tag
      className={cx(styles.card, padded && styles.padded, className)}
      aria-labelledby={labelledBy}
    >
      {children}
    </Tag>
  )
}
