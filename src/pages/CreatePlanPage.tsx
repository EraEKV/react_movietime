import { useTranslation } from 'react-i18next'
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import Banner from '../shared/ui/Banner/Banner'
import Button from '../shared/ui/Button/Button'
import ButtonLink from '../shared/ui/ButtonLink/ButtonLink'
import ErrorState from '../shared/ui/EmptyState/ErrorState'
import { LivePreview, PreviewStep } from '../components/Planner/PlanPreview'
import ScheduleStep from '../components/Planner/ScheduleStep'
import SourceStep from '../components/Planner/SourceStep'
import StartStep from '../components/Planner/StartStep'
import Skeleton from '../shared/ui/Skeleton/Skeleton'
import Stepper from '../shared/ui/Stepper/Stepper'
import { useLibraryEntry } from '../hooks/useLibrary'
import { useListAuthor } from '../hooks/useLists'
import { loadPlannerService, useBookedSessions, usePlans } from '../hooks/usePlanner'
import { usePlanSource, type PickerKind, type SourcePick } from '../hooks/usePlanSource'
import type { ScheduleOptions, Weekday } from '../types/plan'
import { localToday, weekdayOf } from '../utils/calendar'
import { offlineMessage } from '../utils/listErrors'
import type { MediaKey } from '../types/media'
import { mediaKey } from '../utils/media'
import {
  defaultPlanTitle,
  nextPlanColor,
  applyOrder,
  isSourceOrder,
  planErrorMessage,
  sourceIdOf,
  startIndexOf,
  type StartChoice,
} from '../utils/planner'
import {
  applyMoves,
  applyTimes,
  canMoveTo,
  marathonMoves,
  moveFilmTo,
  removeFilm,
  sessionKey,
  type Moves,
  type Times,
} from '../utils/previewEdits'
import { findConflicts, type Booking } from '../utils/conflicts'
import { buildSchedule, planSummary, scheduleProblem, timeOn, unitsLabel } from '../utils/schedule'
import styles from '../components/Planner/Planner.module.css'

const STEP_KEYS = ['steps.pick', 'steps.start', 'steps.schedule', 'steps.preview'] as const

/** ?series=1396, ?list=abc or ?collection=10 from the entry points ("Plan watching", "Plan a marathon"). */
function pickFromUrl(params: URLSearchParams): SourcePick | null {
  const series = Number(params.get('series'))
  if (Number.isInteger(series) && series > 0) {
    return { kind: 'series', id: series, title: '', posterPath: null }
  }
  const collection = Number(params.get('collection'))
  if (Number.isInteger(collection) && collection > 0) {
    return { kind: 'collection', id: collection, title: '', posterPath: null }
  }
  const list = params.get('list')
  return list ? { kind: 'list', id: list, title: '', posterPath: null } : null
}

/** Mon/Wed/Fri by default; today's weekday too when it's one of those evenings. */
const DEFAULT_DAYS: Weekday[] = [1, 3, 5]

export default function CreatePlanPage() {
  const { t } = useTranslation(['planner', 'common'])
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const author = useListAuthor()
  const plans = usePlans()
  const today = localToday()

  const [pick, setPick] = useState<SourcePick | null>(() => pickFromUrl(params))
  const [kind, setKind] = useState<PickerKind>(pick?.kind === 'list' ? 'list' : 'series')
  // Coming from a title page, the title is already chosen: start on step 2.
  const [step, setStep] = useState(pick ? 1 : 0)
  // The evenings my other plans already take, looked at once the preview is open.
  const bookings = useBookedSessions(plans.plans, step === 3)
  const [choice, setChoice] = useState<StartChoice>({ mode: 'continue' })
  const [options, setOptions] = useState<ScheduleOptions>({
    startDate: today,
    weekdays: DEFAULT_DAYS.includes(weekdayOf(today))
      ? DEFAULT_DAYS
      : [...DEFAULT_DAYS, weekdayOf(today)].toSorted(),
    time: '21:00',
    perSession: 2,
  })
  // A marathon's films in the order the user dragged them; null = as the source gave them.
  const [order, setOrder] = useState<MediaKey[] | null>(null)
  // Films the user crossed out in the preview, and days they moved sessions to. The moves
  // belong to one schedule: they carry a signature and are ignored once it changes.
  const [dropped, setDropped] = useState<MediaKey[]>([])
  const [edits, setEdits] = useState<{ signature: string; moves: Moves; times: Times } | null>(null)
  const [customTitle, setCustomTitle] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const source = usePlanSource(pick)
  const loaded = source.status === 'success' ? source.data : null
  const entry = useLibraryEntry(pick?.kind === 'series' ? mediaKey('tv', pick.id) : null)
  const progress = entry?.progress ?? null

  const name = loaded?.name || pick?.title || ''
  const posterPath = loaded?.posterPath ?? pick?.posterPath ?? null
  // A list and a collection are both movie marathons: one film per evening.
  const isList = pick?.kind === 'list' || pick?.kind === 'collection'
  // Movies: one per night. Memoized so the schedule below isn't rebuilt on every render.
  const effective = useMemo<ScheduleOptions>(
    () => (isList ? { ...options, perSession: 1 } : options),
    [isList, options],
  )

  // Everything below is derived from state on each render — no effects to keep in sync.
  const ordered = useMemo(
    () => (loaded ? applyOrder(loaded.units, isList ? order : null) : []),
    [loaded, isList, order],
  )
  const start = startIndexOf(ordered, progress, choice)
  const units = useMemo(
    () => ordered.slice(start).filter((unit) => !dropped.includes(unit.mediaKey)),
    [ordered, start, dropped],
  )
  const signature = JSON.stringify([effective, choice, pick?.kind, pick?.id])
  const moves = useMemo<Moves>(
    () => (edits?.signature === signature ? edits.moves : {}),
    [edits, signature],
  )
  const times = useMemo<Times>(
    () => (edits?.signature === signature ? edits.times : {}),
    [edits, signature],
  )
  const sessions = useMemo(
    () => applyTimes(applyMoves(buildSchedule(units, effective), moves, isList), times, isList),
    [units, effective, moves, times, isList],
  )
  // What is created: the sessions as shaped, and their units in that order.
  const plannedUnits = useMemo(() => sessions.flatMap((s) => s.units), [sessions])
  const edited =
    dropped.length > 0 ||
    Object.keys(moves).length > 0 ||
    Object.keys(times).length > 0 ||
    (isList && loaded !== null && !isSourceOrder(ordered, loaded.units))
  const overlaps = useMemo(() => {
    const found: Record<string, Booking[]> = {}
    for (const session of sessions) {
      const clash = findConflicts(session, bookings)
      if (clash.length > 0) found[sessionKey(session, isList)] = clash
    }
    return found
  }, [sessions, bookings, isList])
  const summary = planSummary(sessions, effective.weekdays)
  const title = (customTitle ?? defaultPlanTitle(isList ? 'list' : 'series', name, units[0])).trim()
  const range = units.length
    ? `${unitsLabel(units.slice(0, 1))} → ${unitsLabel(units.slice(-1))}`
    : ''
  const color = nextPlanColor(plans.plans ?? [])
  const problem = scheduleProblem(effective)

  const canContinue = [
    loaded !== null && loaded.units.length > 0,
    units.length > 0,
    problem === null && sessions.length > 0,
    title.length > 0,
  ][step]

  function changePick(next: SourcePick) {
    setPick(next)
    setChoice(next.kind !== 'series' ? { mode: 'movie', index: 0 } : { mode: 'continue' })
    setCustomTitle(null)
    resetEdits()
  }

  function resetEdits() {
    setOrder(null)
    setDropped([])
    setEdits(null)
  }

  /** A marathon edit: films in a new order on new dates, stored as order + custom dates. */
  function commitMarathon(change: { keys: string[]; dates: string[] }, removed?: string) {
    const byKey = new Map(ordered.map((unit) => [unit.mediaKey, unit]))
    const films = change.keys.flatMap((key) => byKey.get(key as MediaKey) ?? [])
    const head = ordered.slice(0, start).map((unit) => unit.mediaKey)
    setOrder([...head, ...films.map((unit) => unit.mediaKey)])
    if (removed) setDropped((list) => [...list, removed as MediaKey])
    setEdits({ signature, moves: marathonMoves(films, change.dates, effective), times })
  }

  const moveSession = (key: string, date: string) => {
    if (!canMoveTo(sessions, key, date, isList, today)) return
    if (isList) return commitMarathon(moveFilmTo(sessions, key, date))
    setEdits({ signature, moves: { ...moves, [key]: date }, times })
  }
  /** A session at its own time; the weekday's usual time needs no entry. */
  const retimeSession = (key: string, time: string) => {
    const session = sessions.find((s) => sessionKey(s, isList) === key)
    if (!session) return
    const { [key]: _, ...rest } = times
    const next = time === timeOn(effective, session.date) ? rest : { ...rest, [key]: time }
    setEdits({ signature, moves, times: next })
  }
  /** A film dragged to another place in the list: the dates stay, the films move. */
  const reorderFilms = (movedKey: string, overKey: string) => {
    const keys = sessions.map((s) => s.units[0]?.mediaKey ?? '')
    const from = keys.indexOf(movedKey as MediaKey)
    const to = keys.indexOf(overKey as MediaKey)
    if (from === -1 || to === -1 || from === to) return
    const [film] = keys.splice(from, 1)
    keys.splice(to, 0, film ?? '')
    commitMarathon({ keys, dates: sessions.map((s) => s.date) })
  }
  async function handleCreate() {
    if (!author || !loaded) return
    if (!navigator.onLine) return setSaveError(offlineMessage())
    setSaving(true)
    setSaveError(null)
    try {
      const service = await loadPlannerService()
      const id = await service.createPlan(
        author,
        {
          title,
          kind: isList ? 'list' : 'series',
          media: loaded.media,
          sourceListId: sourceIdOf(pick),
          options: {
            ...effective,
            from:
              units[0]?.season != null && units[0].episode != null
                ? { season: units[0].season, episode: units[0].episode }
                : null,
          },
          units: plannedUnits,
          sessions,
        },
        color,
      )
      navigate(`/planner/${id}`, {
        replace: true,
        state: {
          notice: t('new.created', {
            sessions: t('common:count.sessions', { count: sessions.length }),
          }),
        },
      })
    } catch (error) {
      setSaving(false)
      setSaveError(planErrorMessage(error))
    }
  }

  const steps = STEP_KEYS.map((key) => t(key))
  const isCollection = pick?.kind === 'collection'
  const errorKey = isCollection
    ? 'new.collectionError'
    : isList
      ? 'new.listError'
      : 'new.episodesError'
  const emptyKey = isCollection
    ? 'new.emptyCollection'
    : isList
      ? 'new.emptyList'
      : 'new.emptySeries'
  let body
  if (step === 0) {
    body = (
      <SourceStep
        kind={kind}
        onKindChange={setKind}
        pick={pick?.kind === kind ? pick : null}
        onPick={changePick}
      />
    )
  } else if (source.status === 'error') {
    body = (
      <ErrorState
        title={t(errorKey)}
        body={source.error.message}
        onRetry={source.reload}
        headingLevel="h3"
        secondary={<Button onClick={() => setStep(0)}>{t('new.pickAnother')}</Button>}
      />
    )
  } else if (!loaded) {
    body = (
      <div className={styles.stack} aria-busy="true" aria-label={t('new.loadingEpisodes')}>
        <Skeleton height={72} radius="md" />
        <Skeleton height={72} radius="md" />
        <Skeleton height={72} radius="md" />
      </div>
    )
  } else if (loaded.units.length === 0) {
    body = (
      <Banner tone="warning" icon="alert">
        {t(emptyKey)}
      </Banner>
    )
  } else if (step === 1) {
    body = (
      <StartStep
        kind={isList ? 'list' : 'series'}
        units={ordered}
        progress={progress}
        choice={choice}
        onChange={setChoice}
        skipped={loaded.skipped}
      />
    )
  } else if (step === 2) {
    body = (
      <ScheduleStep
        kind={isList ? 'list' : 'series'}
        options={effective}
        onChange={setOptions}
        today={today}
      />
    )
  } else {
    body = (
      <PreviewStep
        title={customTitle ?? title}
        onTitleChange={setCustomTitle}
        titleError={title.length === 0 ? t('new.nameRequired') : null}
        summary={summary}
        sessions={sessions}
        name={name}
        color={color}
        today={today}
        movies={isList}
        onMove={isList ? reorderFilms : undefined}
        onRemove={isList ? (key) => commitMarathon(removeFilm(sessions, key), key) : undefined}
        onMoveSession={moveSession}
        onRetime={retimeSession}
        overlaps={overlaps}
        canMoveSession={(key, date) => canMoveTo(sessions, key, date, isList, today)}
        onReset={edited ? resetEdits : undefined}
      />
    )
  }

  return (
    <div className={styles.create}>
      <title>{t('new.pageTitle')}</title>
      <ButtonLink to="/planner" variant="ghost" icon="chevron-left" className={styles.back}>
        {t('title')}
      </ButtonLink>
      <h1 className={styles.pageTitle}>{t('new.heading')}</h1>
      <Stepper steps={steps} current={step} />

      <div className={styles.createGrid}>
        <section className={styles.stepCard} aria-labelledby="step-title">
          <h2 id="step-title" className={styles.stepTitle}>
            {steps[step]}
          </h2>
          {body}
        </section>
        <LivePreview
          name={name}
          posterPath={posterPath}
          range={range}
          summary={pick ? summary : null}
        />
      </div>

      {saveError && (
        <Banner tone="warning" icon="alert">
          {saveError}
        </Banner>
      )}

      <div className={styles.stepActions}>
        <Button
          variant="ghost"
          icon="chevron-left"
          disabled={step === 0 || saving}
          onClick={() => setStep(step - 1)}
        >
          {t('new.back')}
        </Button>
        {step < steps.length - 1 ? (
          <Button
            variant="primary"
            iconRight="arrow-right"
            disabled={!canContinue}
            onClick={() => setStep(step + 1)}
          >
            {t('new.continue')}
          </Button>
        ) : (
          <Button
            variant="primary"
            icon="check"
            disabled={!canContinue}
            loading={saving}
            onClick={() => void handleCreate()}
          >
            {t('new.submit', { sessions: t('common:count.sessions', { count: sessions.length }) })}
          </Button>
        )}
      </div>
    </div>
  )
}
