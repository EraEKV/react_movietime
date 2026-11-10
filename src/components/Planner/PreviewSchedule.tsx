import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { imageUrl } from '../../shared/api/tmdb'
import { formatRuntime } from '../../shared/lib/format'
import Button from '../../shared/ui/Button/Button'
import Icon from '../../shared/ui/Icon/Icon'
import IconButton from '../../shared/ui/IconButton/IconButton'
import SortableList from '../../shared/ui/SortableList/SortableList'
import type { ScheduledSession } from '../../types/plan'
import { formatDay } from '../../utils/calendar'
import { cx } from '../../shared/lib/cx'
import SelectField from '../../shared/ui/SelectField/SelectField'
import { timeOptions } from '../../utils/planner'
import { sessionKey } from '../../utils/previewEdits'
import { groupByWeek, unitsLabel, weekLabel } from '../../utils/schedule'
import styles from './Planner.module.css'

/** A long series is cut to this many sessions until the user asks for all of them. */
export const AGENDA_PREVIEW = 8

const dayLabel = (day: string) =>
  formatDay(day, { weekday: 'short', month: 'short', day: 'numeric' })

interface PreviewScheduleProps {
  sessions: ScheduledSession[]
  today: string
  /** A movie marathon: one film per evening, shown as a flat list with posters. */
  movies: boolean
  /** Marathons only: a film was dropped where another one is (media keys). Enables dragging. */
  onMove?: (movedKey: string, overKey: string) => void
  /** Marathons only: drop a film from the plan (media key). Offered while two or more remain. */
  onRemove?: (mediaKey: string) => void
  /** Offers a time picker on every session (key as in `sessionKey`). */
  onRetime?: (key: string, time: string) => void
  /** Put the plan back as the source and the weekdays give it (order, dates, dropped films). */
  onReset?: () => void
}

/**
 * "What and when": every session of the plan with its date, time and what is on — the full
 * film or episode names the calendar's small chips can't fit. Series are grouped by week and
 * cut after a few sessions; a marathon is one flat list.
 */
export default function PreviewSchedule({
  sessions,
  today,
  movies,
  onMove,
  onRemove,
  onRetime,
  onReset,
}: PreviewScheduleProps) {
  const { t } = useTranslation(['planner', 'common'])
  const [all, setAll] = useState(false)
  const slot = (session: ScheduledSession) => (
    <SlotCell
      session={session}
      onTime={onRetime && ((time) => onRetime(sessionKey(session, movies), time))}
    />
  )

  if (sessions.length === 0) return null

  if (movies) {
    const sortable = onMove !== undefined && sessions.length > 1
    const removable = onRemove !== undefined && sessions.length > 1
    if (!sortable) {
      return (
        <ol className={styles.agendaList} aria-label={t('preview.scheduleLabel')}>
          {sessions.map((session) => (
            <li key={session.index} className={styles.agendaRow}>
              {slot(session)}
              <FilmCells session={session} />
            </li>
          ))}
        </ol>
      )
    }
    return (
      <div className={styles.agenda}>
        <div className={styles.agendaHint}>
          <p>{t('preview.dragHint')}</p>
          {onReset && (
            <Button variant="ghost" icon="refresh" onClick={onReset}>
              {t('preview.reset')}
            </Button>
          )}
        </div>
        <SortableList
          items={sessions}
          getId={(session) => session.units[0]?.mediaKey ?? String(session.index)}
          onMove={onMove}
          label={t('preview.scheduleLabel')}
          className={styles.agendaList}
          rowClassName={styles.agendaRow}
          texts={{
            instructions: t('preview.reorder.instructions'),
            handle: (session) => t('preview.reorder.handle', { title: session.units[0]?.title }),
            pickedUp: (session) =>
              t('preview.reorder.pickedUp', { title: session.units[0]?.title }),
            movedTo: (session, place) =>
              t('preview.reorder.movedTo', { title: session.units[0]?.title, place }),
            dropped: (session, place) =>
              t('preview.reorder.dropped', { title: session.units[0]?.title, place }),
            cancelled: (session) =>
              t('preview.reorder.cancelled', { title: session.units[0]?.title }),
          }}
          renderItem={(session, handle) => (
            <>
              {handle}
              {slot(session)}
              <FilmCells session={session} />
              {removable && (
                <IconButton
                  icon="x"
                  size="sm"
                  label={t('preview.remove', { title: session.units[0]?.title })}
                  onClick={() => onRemove(session.units[0]?.mediaKey ?? '')}
                />
              )}
            </>
          )}
        />
      </div>
    )
  }

  const shown = all ? sessions : sessions.slice(0, AGENDA_PREVIEW)
  return (
    <div className={styles.agenda}>
      {groupByWeek(shown).map(([monday, list]) => (
        <section key={monday} className={styles.agendaWeek} aria-labelledby={`agenda-${monday}`}>
          <h4 id={`agenda-${monday}`} className={styles.kicker}>
            {weekLabel(monday, today)}
          </h4>
          <ol className={styles.agendaList}>
            {list.map((session) => (
              <li key={session.index} className={styles.agendaRow}>
                <EpisodeRow session={session} slot={slot(session)} />
              </li>
            ))}
          </ol>
        </section>
      ))}
      {sessions.length > AGENDA_PREVIEW && (
        <Button
          variant="ghost"
          className={styles.agendaToggle}
          aria-expanded={all}
          onClick={() => setAll(!all)}
        >
          {all
            ? t('preview.showFewer')
            : t('preview.showAll', {
                sessions: t('common:count.sessions', { count: sessions.length }),
              })}
        </Button>
      )}
    </div>
  )
}

/** The date and time slot of a session. */
export function SlotCell({
  session,
  onTime,
}: {
  session: ScheduledSession
  /** With it the time is a picker. */
  onTime?: (time: string) => void
}) {
  const { t } = useTranslation('planner')
  return (
    <span className={cx(styles.agendaDate, onTime && styles.agendaDateEdit)}>
      <strong>{dayLabel(session.date)}</strong>
      {onTime ? (
        <SelectField
          label={t('preview.timeFor', { day: dayLabel(session.date) })}
          hideLabel
          value={session.time}
          options={timeOptions(session.time)}
          onChange={onTime}
        />
      ) : (
        <span>{session.time}</span>
      )}
    </span>
  )
}

/** One film on one evening. */
export function FilmCells({ session }: { session: ScheduledSession }) {
  const film = session.units[0]
  const poster = imageUrl(film?.media?.posterPath, 'w92')
  const sub = [film?.media?.year, formatRuntime(film?.runtime)].filter(Boolean).join(' · ')
  return (
    <>
      <span className={styles.agendaPoster} aria-hidden="true">
        {poster ? <img src={poster} alt="" loading="lazy" /> : <Icon name="film" size={16} />}
      </span>
      <span className={styles.agendaText}>
        <strong className={styles.agendaTitle}>{film?.title}</strong>
        {sub && <span className={styles.agendaSub}>{sub}</span>}
      </span>
    </>
  )
}

/** One session of a series: the episode range, the runtime and the episode names. */
function EpisodeRow({ session, slot }: { session: ScheduledSession; slot: ReactNode }) {
  const names = session.units.map((unit) => unit.title).join(' · ')
  const sub = [formatRuntime(session.minutes), names].filter(Boolean).join(' · ')
  return (
    <>
      {slot}
      <span className={styles.agendaText}>
        <strong className={styles.agendaTitle}>{unitsLabel(session.units)}</strong>
        {sub && <span className={styles.agendaSub}>{sub}</span>}
      </span>
    </>
  )
}
