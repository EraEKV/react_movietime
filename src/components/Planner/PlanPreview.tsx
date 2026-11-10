import { useTranslation } from 'react-i18next'
import { imageUrl } from '../../shared/api/tmdb'
import type { PlanColor, ScheduledSession } from '../../types/plan'
import { formatDay, monthGrid, monthOf } from '../../utils/calendar'
import type { PlanSummary } from '../../utils/schedule'
import { totalHours, unitsLabel } from '../../utils/schedule'
import { sessionKey } from '../../utils/previewEdits'
import Banner from '../../shared/ui/Banner/Banner'
import CalendarMonth from '../CalendarMonth/CalendarMonth'
import StatTile from '../../shared/ui/StatTile/StatTile'
import TextField from '../../shared/ui/TextField/TextField'
import PreviewSchedule from './PreviewSchedule'
import styles from './Planner.module.css'

const finishLabel = (day: string | null) =>
  day ? formatDay(day, { month: 'short', day: 'numeric' }) : '—'

/** The four numbers of a plan: sessions, time, nights a week, finish date. */
function SummaryTiles({ summary, size }: { summary: PlanSummary; size: 'md' | 'sm' }) {
  const { t } = useTranslation('planner')
  const hours = totalHours(summary.minutes)
  return (
    <div className={size === 'md' ? styles.tiles : styles.tilesSmall}>
      <StatTile
        size={size}
        label={t('preview.sessions')}
        value={summary.sessions}
        icon={size === 'md' ? 'calendar' : undefined}
      />
      <StatTile
        size={size}
        label={t('preview.total')}
        value={hours.value}
        unit={hours.unit}
        icon={size === 'md' ? 'clock' : undefined}
      />
      <StatTile
        size={size}
        label={t('preview.perWeek')}
        value={summary.perWeek}
        unit={t('nights', { count: summary.perWeek }).replace(/^\d+\s*/, '')}
        icon={size === 'md' ? 'list' : undefined}
      />
      <StatTile
        size={size}
        label={t('preview.finishes')}
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
  /** A movie marathon (list or collection): one film per evening. */
  movies: boolean
  /** Marathons: a film was dropped where another one is. Enables dragging in the list. */
  onMove?: (movedKey: string, overKey: string) => void
  /** Marathons: a film was dropped from the plan (media key). */
  onRemove?: (mediaKey: string) => void
  /** A session was dropped on another day in the calendar (see `sessionKey`). */
  onMoveSession?: (key: string, date: string) => void
  /** Where a session may land; the calendar only lights up those days. */
  canMoveSession?: (key: string, date: string) => boolean
  /** Something was changed by hand; put everything back. */
  onReset?: () => void
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
  movies,
  onMove,
  onRemove,
  onMoveSession,
  canMoveSession,
  onReset,
}: PreviewStepProps) {
  const { t } = useTranslation('planner')
  const month = monthOf(summary.firstDate ?? today)
  return (
    <div className={styles.stack}>
      <TextField
        label={t('preview.name')}
        value={title}
        onChange={onTitleChange}
        maxLength={120}
        error={titleError}
      />
      <SummaryTiles summary={summary} size="md" />
      <section className={styles.previewCalendar} aria-label={t('preview.schedule')}>
        <h3 className={styles.panelTitle}>{t('preview.schedule')}</h3>
        <PreviewSchedule
          sessions={sessions}
          today={today}
          movies={movies}
          onMove={onMove}
          onRemove={onRemove}
          onReset={onReset}
        />
      </section>
      <section className={styles.previewCalendar} aria-label={t('preview.firstWeeks')}>
        <h3 className={styles.panelTitle}>{t('preview.firstWeeks')}</h3>
        {onMoveSession && (
          <p className={styles.agendaHint}>
            {t(movies ? 'preview.moveHintFilms' : 'preview.moveHintEpisodes')}
          </p>
        )}
        <CalendarMonth
          label={t('preview.firstWeeksLabel')}
          month={month}
          days={monthGrid(month)}
          today={today}
          compact
          size="sm"
          maxPerDay={1}
          onMove={onMoveSession}
          canDrop={canMoveSession}
          items={sessions.map((s) => ({
            key: sessionKey(s, movies),
            date: s.date,
            color,
            // A marathon's chip names the film (the plan's name is the same on every day).
            title: movies ? (s.units[0]?.title ?? name) : name,
            range: movies ? '' : unitsLabel(s.units),
            time: movies ? s.time : undefined,
            status: 'pending',
            movable: onMoveSession !== undefined,
            posterPath: s.units[0]?.media?.posterPath,
          }))}
        />
      </section>
      <Banner>{t('preview.banner')}</Banner>
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
  const { t } = useTranslation('planner')
  const poster = imageUrl(posterPath, 'w154')
  return (
    <aside className={styles.live} aria-label={t('preview.live')}>
      <span className={styles.kicker}>{t('preview.live')}</span>
      <div className={styles.liveTitle}>
        <span className={styles.livePoster} aria-hidden="true">
          {poster && <img src={poster} alt="" />}
        </span>
        <span className={styles.liveText}>
          <strong>{name || t('preview.pickFirst')}</strong>
          {range && <span className={styles.muted}>{range}</span>}
        </span>
      </div>
      {summary && summary.sessions > 0 ? (
        <SummaryTiles summary={summary} size="sm" />
      ) : (
        <p className={styles.muted}>{t('preview.numbers')}</p>
      )}
    </aside>
  )
}
