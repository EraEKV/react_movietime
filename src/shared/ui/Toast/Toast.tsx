import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { IconName } from '../Icon/icons'
import Icon from '../Icon/Icon'
import styles from './Toast.module.css'

interface ToastProps {
  children: ReactNode
  icon?: IconName
  /** e.g. "Undo". */
  actionLabel?: string
  /** Icon before the action label, e.g. "undo". */
  actionIcon?: IconName
  onAction?: () => void
}

/**
 * role="status" + aria-live: screen readers announce it without moving focus.
 * It is drawn in a portal on <body>: wherever a page puts it in the tree, no ancestor with
 * its own stacking context (a card with a transform, a container query box) can pull it
 * under the posters and cards that come after it.
 */
export default function Toast({ children, icon, actionLabel, actionIcon, onAction }: ToastProps) {
  return createPortal(
    <div className={styles.region}>
      <div className={styles.toast} role="status" aria-live="polite">
        {icon && <Icon name={icon} size={18} />}
        <span className={styles.message}>{children}</span>
        {actionLabel && onAction && (
          <button type="button" className={styles.action} onClick={onAction}>
            {actionIcon && <Icon name={actionIcon} size={16} />}
            {actionLabel}
          </button>
        )}
      </div>
    </div>,
    document.body,
  )
}
