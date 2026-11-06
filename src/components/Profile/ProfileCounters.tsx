import { useLibrary } from '../../hooks/useLibrary'
import { useMyLists } from '../../hooks/useLists'
import { usePlans } from '../../hooks/usePlanner'
import StatTile from '../StatTile/StatTile'
import styles from './Profile.module.css'

/**
 * Library, lists and plans as clickable tiles. Each number comes from the same live source
 * as its page, so a tile never disagrees with what you see after clicking it.
 */
export default function ProfileCounters() {
  const library = useLibrary()
  const titles = library.entries.length
  const lists = useMyLists()
  const plans = usePlans()

  const activePlans = plans.plans?.filter((p) => p.status === 'active').length ?? 0
  const sharedPlans = plans.plans?.filter((p) => plans.sharedIds.has(p.id)).length ?? 0

  return (
    <section className={styles.counters} aria-label="Your numbers">
      <StatTile
        label="Library"
        icon="bookmark"
        value={titles}
        unit={titles === 1 ? 'title' : 'titles'}
        loading={library.status === 'loading'}
        detail={library.status === 'error' ? 'Couldn’t sync' : undefined}
        to="/library"
      />
      <StatTile
        label="Lists"
        icon="list"
        value={lists.data?.length ?? '—'}
        unit={lists.data ? (lists.data.length === 1 ? 'list' : 'lists') : undefined}
        loading={lists.status === 'loading' || lists.status === 'idle'}
        detail={lists.status === 'error' ? 'Couldn’t load' : undefined}
        to="/lists"
      />
      <StatTile
        label="Plans"
        icon="calendar"
        value={plans.plans?.length ?? '—'}
        unit={plans.plans ? (plans.plans.length === 1 ? 'plan' : 'plans') : undefined}
        loading={plans.status === 'loading' || plans.status === 'idle'}
        detail={
          plans.status === 'error'
            ? 'Couldn’t load'
            : `${activePlans} active${sharedPlans ? ` · ${sharedPlans} shared` : ''}`
        }
        to="/planner"
      />
    </section>
  )
}
