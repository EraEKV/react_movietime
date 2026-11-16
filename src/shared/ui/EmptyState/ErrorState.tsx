import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { cx } from '../../lib/cx'
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
  icon: iconProp,
  headingLevel: Heading = 'h2',
}: ErrorStateProps) {
  const { t } = useTranslation()
  const online = useOnlineStatus()
  // A load error without a network is an offline notice, not a fault of the page.
  const offline = !online && title === undefined && body === undefined
  const icon = iconProp ?? (offline ? 'wifi-off' : 'alert')
  return (
    <div className={cx(styles.state, styles.error)} role="alert">
      <div className={styles.icon}>
        <Icon name={icon} size={28} />
      </div>
      <Heading className={styles.title}>
        {title ?? (offline ? t('states.offlineTitle') : t('states.errorTitle'))}
      </Heading>
      {body !== null && (
        <p className={styles.body}>
          {body ?? (offline ? t('states.offlineBody') : t('states.errorBody'))}
        </p>
      )}
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
