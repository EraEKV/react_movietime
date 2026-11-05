import type { ReactNode } from 'react'
import styles from './Toast.module.css'

export default function Toast({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className={styles.toast} role="status">
      <span>{children}</span>
      {action}
    </div>
  )
}
