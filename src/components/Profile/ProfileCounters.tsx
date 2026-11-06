import { useTranslation } from 'react-i18next'
import { useLibrary } from '../../hooks/useLibrary'
import { useMyLists } from '../../hooks/useLists'
import { usePlans } from '../../hooks/usePlanner'
import StatTile from '../../shared/ui/StatTile/StatTile'
import styles from './Profile.module.css'

/**
 * Library, lists and plans as clickable tiles. Each number comes from the same live source
 * as its page, so a tile never disagrees with what you see after clicking it.
 */
export default function ProfileCounters() {
  const { t } = useTranslation(['profile', 'common'])
  const library = useLibrary()
  const titles = library.entries.length
  const lists = useMyLists()
  const plans = usePlans()

  const activePlans = plans.plans?.filter((p) => p.status === 'active').length ?? 0
  const sharedPlans = plans.plans?.filter((p) => plans.sharedIds.has(p.id)).length ?? 0

  return (
    <section className={styles.counters} aria-label={t('counters.label')}>
      <StatTile
        label={t('counters.library')}
        icon="bookmark"
        value={titles}
        unit={t('counters.titlesUnit', { count: titles })}
        loading={library.status === 'loading'}
        detail={library.status === 'error' ? t('counters.syncFailed') : undefined}
        to="/library"
      />
      <StatTile
        label={t('counters.lists')}
        icon="list"
        value={lists.data?.length ?? '—'}
        unit={lists.data ? t('counters.listsUnit', { count: lists.data.length }) : undefined}
        loading={lists.status === 'loading' || lists.status === 'idle'}
        detail={lists.status === 'error' ? t('counters.loadFailed') : undefined}
        to="/lists"
      />
      <StatTile
        label={t('counters.plans')}
        icon="calendar"
        value={plans.plans?.length ?? '—'}
        unit={plans.plans ? t('counters.plansUnit', { count: plans.plans.length }) : undefined}
        loading={plans.status === 'loading' || plans.status === 'idle'}
        detail={
          plans.status === 'error'
            ? t('counters.loadFailed')
            : sharedPlans
              ? t('counters.plansShared', { active: activePlans, shared: sharedPlans })
              : t('counters.plansDetail', { active: activePlans })
        }
        to="/planner"
      />
    </section>
  )
}
