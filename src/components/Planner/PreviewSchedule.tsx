import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { imageUrl } from '../../shared/api/tmdb'
import { formatRuntime } from '../../shared/lib/format'
import Button from '../../shared/ui/Button/Button'
import Icon from '../../shared/ui/Icon/Icon'
import SortableList from '../../shared/ui/SortableList/SortableList'
import type { ScheduledSession } from '../../types/plan'
import { formatDay } from '../../utils/calendar'
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
  /** Marathons only: put the films back in the order the source gave them. */
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
  onReset,
}: PreviewScheduleProps) {
  const { t } = useTranslation(['planner', 'common'])
  const [all, setAll] = useState(false)

  if (sessions.length === 0) return null

  if (movies) {
    const sortable = onMove !== undefined && sessions.length > 1
    if (!sortable) {
      return (
        <ol className={styles.agendaList} aria-label={t('preview.scheduleLabel')}>
          {sessions.map((session) => (
            <li key={session.index} className={styles.agendaRow}>
              <SlotCell session={session} />
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
              {t('preview.resetOrder')}
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
              <SlotCell session={session} />
              <FilmCells session={session} />
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
                <EpisodeRow session={session} />
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
export function SlotCell({ session }: { session: ScheduledSession }) {
  return (
    <span className={styles.agendaDate}>
      <strong>{dayLabel(session.date)}</strong>
      <span>{session.time}</span>
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
function EpisodeRow({ session }: { session: ScheduledSession }) {
  const names = session.units.map((unit) => unit.title).join(' · ')
  const sub = [formatRuntime(session.minutes), names].filter(Boolean).join(' · ')
  return (
    <>
      <SlotCell session={session} />
      <span className={styles.agendaText}>
        <strong className={styles.agendaTitle}>{unitsLabel(session.units)}</strong>
        {sub && <span className={styles.agendaSub}>{sub}</span>}
      </span>
    </>
  )
}
