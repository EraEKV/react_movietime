import { imageUrl } from '../../api/tmdb'
import type { PlanColor, ScheduledSession } from '../../types/plan'
import { formatDay, monthGrid, monthOf } from '../../utils/calendar'
import type { PlanSummary } from '../../utils/schedule'
import { totalHours, unitsLabel } from '../../utils/schedule'
import Banner from '../Banner/Banner'
import CalendarMonth from '../CalendarMonth/CalendarMonth'
import StatTile from '../StatTile/StatTile'
import TextField from '../TextField/TextField'
import styles from './Planner.module.css'

const finishLabel = (day: string | null) =>
  day ? formatDay(day, { month: 'short', day: 'numeric' }) : '—'

/** The four numbers of a plan: sessions, time, nights a week, finish date. */
function SummaryTiles({ summary, size }: { summary: PlanSummary; size: 'md' | 'sm' }) {
  const hours = totalHours(summary.minutes)
  return (
    <div className={size === 'md' ? styles.tiles : styles.tilesSmall}>
      <StatTile
        size={size}
        label="Sessions"
        value={summary.sessions}
        icon={size === 'md' ? 'calendar' : undefined}
      />
      <StatTile
        size={size}
        label="Total time"
        value={hours.value}
        unit={hours.unit}
        icon={size === 'md' ? 'clock' : undefined}
      />
      <StatTile
        size={size}
        label="Per week"
        value={summary.perWeek}
        unit={summary.perWeek === 1 ? 'night' : 'nights'}
        icon={size === 'md' ? 'list' : undefined}
      />
      <StatTile
        size={size}
        label="Finishes"
        value={finishLabel(summary.finishDate)}
        icon={size === 'md' ? 'check' : undefined}
      />
    </div>
  )
}

interface PreviewStepProps {
  title: string
  onTitleChange: (title: string) => void
  titleError: string | null
  summary: PlanSummary
  sessions: ScheduledSession[]
  name: string
  color: PlanColor
  today: string
}

/** Step 4: the numbers, the first weeks on a calendar, and the plan's name. */
export function PreviewStep({
  title,
  onTitleChange,
  titleError,
  summary,
  sessions,
  name,
  color,
  today,
}: PreviewStepProps) {
  const month = monthOf(summary.firstDate ?? today)
  return (
    <div className={styles.stack}>
      <TextField
        label="Plan name"
        value={title}
        onChange={onTitleChange}
        maxLength={120}
        error={titleError}
      />
      <SummaryTiles summary={summary} size="md" />
      <section className={styles.previewCalendar} aria-label="First weeks">
        <h3 className={styles.panelTitle}>First weeks</h3>
        <CalendarMonth
          label="First weeks of the plan"
          month={month}
          days={monthGrid(month)}
          today={today}
          compact
          size="sm"
          maxPerDay={1}
          items={sessions.map((s) => ({
            key: String(s.index),
            date: s.date,
            color,
            title: name,
            range: unitsLabel(s.units),
            status: 'pending',
          }))}
        />
      </section>
      <Banner>
        You can reschedule or skip any session later. Moving one can shift all later ones.
      </Banner>
    </div>
  )
}

interface LivePreviewProps {
  name: string
  posterPath: string | null
  range: string
  summary: PlanSummary | null
}

/** Desktop side card that follows every change in the stepper. */
export function LivePreview({ name, posterPath, range, summary }: LivePreviewProps) {
  const poster = imageUrl(posterPath, 'w154')
  return (
    <aside className={styles.live} aria-label="Live preview">
      <span className={styles.kicker}>Live preview</span>
      <div className={styles.liveTitle}>
        <span className={styles.livePoster} aria-hidden="true">
          {poster && <img src={poster} alt="" />}
        </span>
        <span className={styles.liveText}>
          <strong>{name || 'Pick a series or a list'}</strong>
          {range && <span className={styles.muted}>{range}</span>}
        </span>
      </div>
      {summary && summary.sessions > 0 ? (
        <SummaryTiles summary={summary} size="sm" />
      ) : (
        <p className={styles.muted}>The numbers appear as soon as there is something to plan.</p>
      )}
    </aside>
  )
}
