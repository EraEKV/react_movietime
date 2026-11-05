import type { ReactNode } from 'react'
import styles from './StatusMessage.module.css'

/**
 * Shared block for error and empty states. `tone="error"` adds an alert role
 * so screen readers announce failures.
 */
interface StatusMessageProps {
  tone?: 'info' | 'error'
  title: string
  children?: ReactNode
  action?: ReactNode
}

export default function StatusMessage({
  tone = 'info',
  title,
  children,
  action,
}: StatusMessageProps) {
  return (
    <div className={styles.box} data-tone={tone} role={tone === 'error' ? 'alert' : 'status'}>
      <span className={styles.icon} aria-hidden="true">
        {tone === 'error' ? '!' : '∅'}
      </span>
      <h2 className={styles.title}>{title}</h2>
      {children && <p className={styles.text}>{children}</p>}
      {action}
    </div>
  )
}
