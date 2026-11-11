import { useTranslation } from 'react-i18next'
import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import { useShowMore } from '../../shared/hooks/useShowMore'
import ShowMore from '../../shared/ui/ShowMore/ShowMore'
import type { Plan } from '../../types/plan'
import { relativeDay } from '../../utils/calendar'
import styles from './Dashboard.module.css'

/**
 * Active plans, one row each: title, done/total, a bar in the plan's calendar colour and
 * the next session day. Every row opens the plan.
 */
export default function PlanProgress({ plans, today }: { plans: Plan[]; today: string }) {
  const { t } = useTranslation('dashboard')
  const more = useShowMore(plans, 3, 5)
  return (
    <>
      <ul className={styles.plans}>
        {more.visible.map((plan) => {
          const title = plan.media?.title ?? plan.title
          const percent = plan.totalUnits ? Math.round((plan.doneUnits / plan.totalUnits) * 100) : 0
          return (
            <li key={plan.id}>
              <Link
                to={`/planner/${plan.id}`}
                className={styles.planRow}
                style={{ '--plan': `var(--plan-${plan.color})` } as CSSProperties}
              >
                <span className={styles.planTitle}>{title}</span>
                <strong className={styles.planCount}>
                  {plan.doneUnits}/{plan.totalUnits}
                </strong>
                <span
                  className={styles.track}
                  role="progressbar"
                  aria-label={t('chart.planProgress', {
                    label: title,
                    done: plan.doneUnits,
                    total: plan.totalUnits,
                  })}
                  aria-valuenow={percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  {percent > 0 && (
                    <span className={styles.planFill} style={{ width: `${percent}%` }} />
                  )}
                </span>
                <span className={styles.planNext}>
                  {plan.nextDate
                    ? t('cards.nextSession', { day: relativeDay(plan.nextDate, today) })
                    : t('cards.noNext')}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
      {more.collapsible && (
        <ShowMore expanded={more.expanded} total={plans.length} onToggle={more.toggle} />
      )}
    </>
  )
}
