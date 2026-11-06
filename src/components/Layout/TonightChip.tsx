import { useUpcoming } from '../../hooks/usePlanner'
import { unitsLabel } from '../../utils/schedule'
import Chip from '../Chip/Chip'
import styles from './TonightChip.module.css'

/**
 * "Tonight 21:00" in the header when one of your plans has a session today that isn't
 * watched yet. Loaded lazily, only for signed-in users; nothing shows while it loads.
 */
export default function TonightChip() {
  const { sessions, today } = useUpcoming()
  const next = sessions?.find((s) => s.session.date === today && s.session.status === 'pending')
  if (!next) return null
  const title = next.plan.media?.title ?? next.plan.title
  return (
    <Chip
      tone="tonight"
      icon="play"
      to="/planner"
      aria-label={`Tonight at ${next.session.time}: ${title}, ${unitsLabel(next.session.units)}. Open planner`}
    >
      {/* Phones: just the time, so the header keeps room for search, theme and avatar. */}
      <span className={styles.word}>Tonight </span>
      {next.session.time}
    </Chip>
  )
}
