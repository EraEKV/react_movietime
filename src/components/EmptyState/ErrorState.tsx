import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'
import { cx } from '../../shared/lib/cx'
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
  title,
  body,
  onRetry,
  retrying = false,
  secondary,
  icon = 'alert',
  headingLevel: Heading = 'h2',
}: ErrorStateProps) {
  const { t } = useTranslation()
  return (
    <div className={cx(styles.state, styles.error)} role="alert">
      <div className={styles.icon}>
        <Icon name={icon} size={28} />
      </div>
      <Heading className={styles.title}>{title ?? t('states.errorTitle')}</Heading>
      {body !== null && <p className={styles.body}>{body ?? t('states.errorBody')}</p>}
      {(onRetry || secondary) && (
        <div className={styles.actions}>
          {onRetry && (
            <Button variant="primary" icon="refresh" onClick={onRetry} loading={retrying}>
              {t('actions.tryAgain')}
            </Button>
          )}
          {secondary}
        </div>
      )}
    </div>
  )
}
