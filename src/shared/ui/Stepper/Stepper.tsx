import { useTranslation } from 'react-i18next'
import { Fragment } from 'react'
import { cx } from '../../lib/cx'
import Icon from '../Icon/Icon'
import styles from './Stepper.module.css'

interface StepperProps {
  steps: string[]
  /** 0-based. */
  current: number
}

/**
 * Numbered steps: done = accent ring + ✓, current = gradient disc, upcoming = outline.
 * On phones only the current label shows; the others stay for screen readers.
 */
export default function Stepper({ steps, current }: StepperProps) {
  const { t } = useTranslation()
  return (
    <ol className={styles.stepper} aria-label={t('ui.steps')}>
      {steps.map((step, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'upcoming'
        return (
          <Fragment key={step}>
            {i > 0 && <li className={styles.separator} aria-hidden="true" />}
            <li
              className={cx(styles.step, styles[state])}
              aria-current={i === current ? 'step' : undefined}
            >
              <span className={styles.number} aria-hidden="true">
                {state === 'done' ? <Icon name="check" size={14} /> : i + 1}
              </span>
              <span className={styles.label}>
                {step}
                {state === 'done' && <span className="sr-only">{t('ui.done')}</span>}
              </span>
            </li>
          </Fragment>
        )
      })}
    </ol>
  )
}
