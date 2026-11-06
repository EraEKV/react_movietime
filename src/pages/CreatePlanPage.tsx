import { useTranslation } from 'react-i18next'
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import Banner from '../components/Banner/Banner'
import Button from '../components/Button/Button'
import ButtonLink from '../components/ButtonLink/ButtonLink'
import ErrorState from '../components/EmptyState/ErrorState'
import { LivePreview, PreviewStep } from '../components/Planner/PlanPreview'
import ScheduleStep from '../components/Planner/ScheduleStep'
import SourceStep from '../components/Planner/SourceStep'
import StartStep from '../components/Planner/StartStep'
import Skeleton from '../components/Skeleton/Skeleton'
import Stepper from '../components/Stepper/Stepper'
import { useLibraryEntry } from '../hooks/useLibrary'
import { useListAuthor } from '../hooks/useLists'
import { loadPlannerService, usePlans } from '../hooks/usePlanner'
import { usePlanSource, type SourcePick } from '../hooks/usePlanSource'
import type { ScheduleOptions, Weekday } from '../types/plan'
import { localToday, weekdayOf } from '../utils/calendar'
import { offlineMessage } from '../utils/listErrors'
import { mediaKey } from '../utils/media'
import {
  defaultPlanTitle,
  nextPlanColor,
  planErrorMessage,
  startIndexOf,
  type StartChoice,
} from '../utils/planner'
import { buildSchedule, planSummary, scheduleProblem, unitsLabel } from '../utils/schedule'
import styles from '../components/Planner/Planner.module.css'

const STEP_KEYS = ['steps.pick', 'steps.start', 'steps.schedule', 'steps.preview'] as const

/** ?series=1396 or ?list=abc from the entry points ("Plan watching", "Plan a marathon"). */
function pickFromUrl(params: URLSearchParams): SourcePick | null {
  const series = Number(params.get('series'))
  if (Number.isInteger(series) && series > 0) {
    return { kind: 'series', id: series, title: '', posterPath: null }
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
  const [kind, setKind] = useState<SourcePick['kind']>(pick?.kind ?? 'series')
  // Coming from a title page, the title is already chosen: start on step 2.
  const [step, setStep] = useState(pick ? 1 : 0)
  const [choice, setChoice] = useState<StartChoice>({ mode: 'continue' })
  const [options, setOptions] = useState<ScheduleOptions>({
    startDate: today,
    weekdays: DEFAULT_DAYS.includes(weekdayOf(today))
      ? DEFAULT_DAYS
      : [...DEFAULT_DAYS, weekdayOf(today)].toSorted(),
    time: '21:00',
    perSession: 2,
  })
  const [customTitle, setCustomTitle] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const source = usePlanSource(pick)
  const loaded = source.status === 'success' ? source.data : null
  const entry = useLibraryEntry(pick?.kind === 'series' ? mediaKey('tv', pick.id) : null)
  const progress = entry?.progress ?? null

  const name = loaded?.name || pick?.title || ''
  const posterPath = loaded?.posterPath ?? pick?.posterPath ?? null
  const isList = pick?.kind === 'list'
  // Movies: one per night. Memoized so the schedule below isn't rebuilt on every render.
  const effective = useMemo<ScheduleOptions>(
    () => (isList ? { ...options, perSession: 1 } : options),
    [isList, options],
  )

  // Everything below is derived from state on each render — no effects to keep in sync.
  const units = useMemo(() => {
    if (!loaded) return []
    return loaded.units.slice(startIndexOf(loaded.units, progress, choice))
  }, [loaded, progress, choice])
  const sessions = useMemo(() => buildSchedule(units, effective), [units, effective])
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
    setChoice(next.kind === 'list' ? { mode: 'movie', index: 0 } : { mode: 'continue' })
    setCustomTitle(null)
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
          sourceListId: isList && pick ? String(pick.id) : null,
          options: {
            ...effective,
            from:
              units[0]?.season != null && units[0].episode != null
                ? { season: units[0].season, episode: units[0].episode }
                : null,
          },
          units,
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
        title={t(isList ? 'new.listError' : 'new.episodesError')}
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
        {t(isList ? 'new.emptyList' : 'new.emptySeries')}
      </Banner>
    )
  } else if (step === 1) {
    body = (
      <StartStep
        kind={isList ? 'list' : 'series'}
        units={loaded.units}
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
