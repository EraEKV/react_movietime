import type { ReactNode } from 'react'
import { cx } from '../../utils/cx'
import Button from '../Button/Button'
import type { IconName } from '../Icon/icons'
import Icon from '../Icon/Icon'
import styles from './EmptyState.module.css'

interface ErrorStateProps {
  title?: string
  body?: ReactNode
  /** Without onRetry (e.g. "not found") no Try again button is shown. */
  onRetry?: () => void
  retrying?: boolean
  secondary?: ReactNode
  icon?: IconName
  headingLevel?: 'h2' | 'h3'
}

/** Says what happened and what to do; role="alert" makes screen readers announce it. */
export default function ErrorState({
  title = 'Something went wrong',
  body = 'We couldn’t load this right now. Check your connection and try again.',
  onRetry,
  retrying = false,
  secondary,
  icon = 'alert',
  headingLevel: Heading = 'h2',
}: ErrorStateProps) {
  return (
    <div className={cx(styles.state, styles.error)} role="alert">
      <div className={styles.icon}>
        <Icon name={icon} size={28} />
      </div>
      <Heading className={styles.title}>{title}</Heading>
      {body && <p className={styles.body}>{body}</p>}
      {(onRetry || secondary) && (
        <div className={styles.actions}>
          {onRetry && (
            <Button variant="primary" icon="refresh" onClick={onRetry} loading={retrying}>
              Try again
            </Button>
          )}
          {secondary}
        </div>
      )}
    </div>
  )
}
