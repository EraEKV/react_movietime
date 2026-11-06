import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { imageUrl } from '../api/tmdb'
import AvatarStack from '../components/AvatarStack/AvatarStack'
import { RoleBadge, VisibilityBadge } from '../components/Badge/ListBadges'
import Banner from '../components/Banner/Banner'
import Button from '../components/Button/Button'
import { buttonClass } from '../components/Button/variants'
import ButtonLink from '../components/ButtonLink/ButtonLink'
import Dialog from '../components/Dialog/Dialog'
import EmptyState from '../components/EmptyState/EmptyState'
import ErrorState from '../components/EmptyState/ErrorState'
import Icon from '../components/Icon/Icon'
import IconButton from '../components/IconButton/IconButton'
import Menu from '../components/Menu/Menu'
import RescheduleDialog from '../components/Planner/RescheduleDialog'
import SessionRow from '../components/Planner/SessionRow'
import ProgressBar from '../components/ProgressBar/ProgressBar'
import ShareDialog from '../components/ShareDialog/ShareDialog'
import Skeleton from '../components/Skeleton/Skeleton'
import Toast from '../components/Toast/Toast'
import { useAuth } from '../hooks/useAuth'
import { useListAuthor } from '../hooks/useLists'
import { loadPlannerService, usePlan, usePlanActions } from '../hooks/usePlanner'
import { useSharing } from '../hooks/useSharing'
import { useTimedState } from '../hooks/useTimedState'
import type { Plan, PlanRole, PlanSession } from '../types/plan'
import { addDays, formatDay, localToday, weekStart } from '../utils/calendar'
import { OFFLINE_MESSAGE } from '../utils/listErrors'
import { noticeFromState } from '../utils/notice'
import {
  canEditSessions,
  planErrorMessage,
  planProgress,
  scheduleLabel,
  unitWord,
} from '../utils/planner'
import { loginPath } from '../utils/redirect'
import { toIcs, unitsLabel } from '../utils/schedule'
import { memberName, membersOf, ROLE_LABELS, shareUrl } from '../utils/sharing'
import NotFoundPage from './NotFoundPage'
import styles from './PlanPage.module.css'

export default function PlanPage() {
  const { id = '' } = useParams()
  // A key per plan: moving between plans starts with fresh dialogs and toasts.
  return <PlanView key={id} id={id} />
}

/** "This week · Nov 2–8", "Next week · …", "Week of Nov 16". */
function weekLabel(monday: string, today: string): string {
  const sunday = addDays(monday, 6)
  const range = `${formatDay(monday, { month: 'short', day: 'numeric' })}–${formatDay(sunday, monday.slice(5, 7) === sunday.slice(5, 7) ? { day: 'numeric' } : { month: 'short', day: 'numeric' })}`
  const thisWeek = weekStart(today)
  if (monday === thisWeek) return `This week · ${range}`
  if (monday === addDays(thisWeek, 7)) return `Next week · ${range}`
  if (monday === addDays(thisWeek, -7)) return `Last week · ${range}`
  return `Week of ${range}`
}

function downloadIcs(plan: Plan, sessions: PlanSession[]) {
  const url = shareUrl('plans', plan.id)
  const name = plan.media?.title ?? plan.title
  const ics = toIcs(
    plan.title,
    sessions
      .filter((s) => s.status === 'pending')
      .map((s) => ({
        uid: `${s.id}@movietime`,
        date: s.date,
        time: s.time,
        minutes: s.minutes,
        summary: `${name} · ${unitsLabel(s.units)}`,
        description: s.units.map((u) => u.title).join('\n'),
        url,
      })),
    new Date(),
  )
  // A Blob URL lets the browser save generated text as a file; revoke it to free memory.
  const href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = href
  link.download = `${plan.title.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'plan'}.ics`
  link.click()
  URL.revokeObjectURL(href)
}

function PlanView({ id }: { id: string }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const author = useListAuthor()
  const state = usePlan(id)
  const actions = usePlanActions()
  const sharing = useSharing('plans', state.status === 'ready' ? state.plan : null)
  const today = localToday()

  const [moving, setMoving] = useState<PlanSession | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [leaveError, setLeaveError] = useState<string | null>(null)
  const passed = noticeFromState(location.state)
  const [toast, showToast, hideToast] = useTimedState<{
    text: string
    undo?: () => void
    error?: boolean
  }>(6000, passed ? { text: passed } : null)

  if (state.status === 'loading' || ((deleting || leaving) && state.status === 'missing')) {
    return <PlanSkeleton />
  }
  if (state.status === 'missing') {
    const hint = !user
      ? ' If it was shared with you, sign in with the invited email.'
      : !user.emailVerified
        ? ' If it was shared with you, confirm your email first: shared access needs a verified address.'
        : ''
    return (
      <NotFoundPage
        title="This plan doesn’t exist"
        text={`It may have been deleted, or the link is wrong. Private plans open only for their owner and members.${hint}`}
        secondary={
          user
            ? { to: '/planner', label: 'Go to planner', icon: 'calendar' }
            : { to: loginPath(location.pathname), label: 'Sign in', icon: 'user' }
        }
      />
    )
  }
  if (state.status === 'error') {
    return (
      <div className={styles.page}>
        <ErrorState
          title="We couldn’t load this plan"
          body={state.error.message}
          onRetry={state.retry}
        />
      </div>
    )
  }

  const { plan, sessions, role } = state
  const editable = canEditSessions(role)
  const report = (error: unknown) => showToast({ text: planErrorMessage(error), error: true })
  /** Session actions: the snapshot shows the result; a failure comes back as a toast. */
  const act = (action: () => Promise<void>, done?: string, undo?: () => Promise<void>) => () =>
    action().then(
      () => {
        if (done) showToast({ text: done, undo: undo && (() => void undo().catch(report)) })
      },
      (error: unknown) => report(error),
    )

  async function handleDelete() {
    if (!navigator.onLine) return setDeleteError(OFFLINE_MESSAGE)
    setDeleting(true)
    setDeleteError(null)
    try {
      await (await loadPlannerService()).deletePlan(plan.id)
      navigate('/planner', { replace: true, state: { notice: `Deleted “${plan.title}”` } })
    } catch (error) {
      setDeleting(false)
      setDeleteError(planErrorMessage(error))
    }
  }

  async function handleLeave() {
    if (!navigator.onLine) return setLeaveError(OFFLINE_MESSAGE)
    setLeaving(true)
    setLeaveError(null)
    try {
      await sharing.leave()
      navigate('/planner', { replace: true, state: { notice: `You left “${plan.title}”` } })
    } catch (error) {
      setLeaving(false)
      setLeaveError(planErrorMessage(error))
    }
  }

  const members = role === 'link' ? [] : membersOf(plan)
  const people = [plan.ownerName, ...members.map((m) => memberName(m.email))]
  const poster = imageUrl(plan.media?.posterPath ?? firstMoviePoster(sessions), 'w185')
  const progress = planProgress(plan)
  const finished =
    plan.status === 'done' ||
    (sessions !== null && sessions.length > 0 && !sessions.some((s) => s.status === 'pending'))

  // Weeks, Monday first, in date order (sessions arrive sorted by date and index).
  const weeks = new Map<string, PlanSession[]>()
  for (const s of sessions ?? []) {
    const monday = weekStart(s.date)
    weeks.set(monday, [...(weeks.get(monday) ?? []), s])
  }
  const pendingCopy = (s: PlanSession) =>
    sessions?.some((c) => c.copyOf === s.id && c.status === 'pending') ?? false

  let actionsBar
  if (role === 'owner') {
    actionsBar = (
      <>
        <Button variant="primary" icon="share" onClick={() => setShareOpen(true)}>
          Share
        </Button>
        <Button
          icon="download"
          disabled={!sessions}
          onClick={() => sessions && downloadIcs(plan, sessions)}
        >
          Export .ics
        </Button>
        <IconButton
          icon="trash"
          label="Delete plan"
          variant="secondary"
          onClick={() => setConfirmDelete(true)}
        />
      </>
    )
  } else {
    actionsBar = (
      <>
        <Button
          icon="download"
          disabled={!sessions}
          onClick={() => sessions && downloadIcs(plan, sessions)}
        >
          Export .ics
        </Button>
        {(role === 'editor' || role === 'viewer') && (
          <Menu
            label="More plan actions"
            align="right"
            triggerClassName={buttonClass('secondary', 'md', { iconOnly: true })}
            trigger={<Icon name="more" size={20} />}
            items={[
              {
                label: 'Leave plan',
                icon: 'logout',
                danger: true,
                onSelect: () => setConfirmLeave(true),
              },
            ]}
          />
        )}
      </>
    )
  }

  let body
  if (state.sessionsError) {
    body = (
      <ErrorState
        title="We couldn’t load the sessions"
        body={state.sessionsError.message}
        onRetry={state.retry}
        headingLevel="h3"
      />
    )
  } else if (!sessions) {
    body = <WeeksSkeleton />
  } else {
    body = (
      <div className={styles.weeks}>
        {[...weeks].map(([monday, list]) => (
          <section key={monday} aria-labelledby={`week-${monday}`} className={styles.week}>
            <h2 id={`week-${monday}`} className={styles.kicker}>
              {weekLabel(monday, today)}
            </h2>
            <ol className={styles.sessions}>
              {list.map((s) => (
                <SessionRow
                  key={s.id}
                  session={s}
                  today={today}
                  editable={editable}
                  ownUid={user?.uid ?? null}
                  // A skip can be undone while its copy at the end is still pending.
                  canUndo={s.status === 'done' || pendingCopy(s)}
                  onComplete={act(
                    () => actions.complete(plan, s),
                    `Marked ${unitsLabel(s.units)} as watched`,
                  )}
                  onSkip={act(
                    () => actions.skip(plan, s),
                    `Skipped ${unitsLabel(s.units)}: moved to the end`,
                    // Undo needs the skipped state, which the snapshot brings; the service
                    // re-reads sessions, so passing the old object with the new status is enough.
                    () => actions.undo(plan, { ...s, status: 'skipped' }),
                  )}
                  onUndo={act(() => actions.undo(plan, s))}
                  onReschedule={() => setMoving(s)}
                />
              ))}
            </ol>
          </section>
        ))}
      </div>
    )
  }

  return (
    <article className={styles.page} aria-labelledby="plan-title">
      <title>{`${plan.title} · Movietime`}</title>
      <ButtonLink
        to={user ? '/planner' : '/'}
        variant="ghost"
        icon="chevron-left"
        className={styles.back}
      >
        {user ? 'Planner' : 'Home'}
      </ButtonLink>

      {role === 'viewer' && (
        <Banner>
          You can view this plan. Ask {plan.ownerName} for editor access to mark sessions.
        </Banner>
      )}
      {role === 'link' && (
        <Banner>
          {user
            ? 'You’re viewing a shared plan. Only its members can mark sessions.'
            : 'You’re viewing a shared plan. Sign in if it was shared with you.'}
        </Banner>
      )}

      <header className={styles.header}>
        <span className={styles.poster} aria-hidden="true">
          {poster ? (
            <img src={poster} alt="" />
          ) : (
            <Icon name={plan.kind === 'series' ? 'tv' : 'film'} size={28} />
          )}
        </span>
        <div className={styles.heading}>
          <span className={styles.kickerRow}>
            <span
              className={styles.dot}
              style={{ background: `var(--plan-${plan.color})` }}
              aria-hidden="true"
            />
            <span className={styles.kicker}>
              Watch plan · {scheduleLabel(plan.options.weekdays, plan.options.time)}
            </span>
          </span>
          <h1 id="plan-title" className={styles.title}>
            {plan.title}
          </h1>
          <div className={styles.progress}>
            <ProgressBar
              value={progress}
              label="Plan progress"
              caption={`${plan.doneUnits} of ${unitWord(plan, plan.totalUnits)} watched · ${
                plan.status === 'done'
                  ? 'finished'
                  : `finishes ${plan.endDate ? formatDay(plan.endDate, { weekday: 'short', month: 'short', day: 'numeric' }) : '—'}`
              }`}
            />
          </div>
          <div className={styles.meta}>
            {people.length > 1 && <AvatarStack people={people} />}
            <span>{peopleLine(plan.ownerName, members, role)}</span>
            <RoleBadge role={role} />
            {role === 'owner' && (
              <VisibilityBadge visibility={plan.visibility} members={plan.memberEmails.length} />
            )}
          </div>
        </div>
        <div className={styles.actions}>{actionsBar}</div>
      </header>

      {finished && (
        <EmptyState
          icon="check"
          headingLevel="h2"
          title="Plan finished"
          body={`Every session is done${plan.kind === 'series' ? '. New episodes? Plan the next season.' : '.'}`}
          actions={
            role !== 'link' && plan.kind === 'series' && plan.media ? (
              <ButtonLink
                to={`/planner/new?series=${plan.media.tmdbId}`}
                variant="primary"
                icon="plus"
              >
                Plan next season
              </ButtonLink>
            ) : undefined
          }
        />
      )}

      {body}

      {moving && sessions && (
        <RescheduleDialog
          session={moving}
          sessions={sessions}
          today={today}
          onClose={() => setMoving(null)}
          onMove={async (date, shiftLater) => {
            try {
              await actions.reschedule(plan, moving, date, shiftLater)
              showToast({
                text: `Moved ${unitsLabel(moving.units)} to ${formatDay(date, { weekday: 'short', month: 'short', day: 'numeric' })}`,
              })
            } catch (error) {
              throw new Error(planErrorMessage(error), { cause: error })
            }
          }}
        />
      )}

      {role === 'owner' && (
        <ShareDialog
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          name={plan.title}
          url={sharing.url}
          owner={{
            name: author?.name ?? plan.ownerName,
            email: user?.email ?? null,
            photoUrl: user?.photoURL ?? null,
          }}
          visibility={plan.visibility}
          roles={plan.roles}
          onVisibilityChange={sharing.setVisibility}
          onInvite={sharing.invite}
          onRoleChange={sharing.changeRole}
          onRemove={sharing.remove}
        />
      )}

      <Dialog
        open={confirmDelete}
        onClose={() => !deleting && setConfirmDelete(false)}
        title="Delete this plan?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)} disabled={deleting}>
              Keep plan
            </Button>
            <Button
              variant="danger-solid"
              icon="trash"
              loading={deleting}
              onClick={() => void handleDelete()}
            >
              Delete plan
            </Button>
          </>
        }
      >
        <p>
          All {sessions?.length ?? ''} sessions will be removed
          {plan.memberEmails.length > 0
            ? ` for you and ${plan.memberEmails.length} other ${plan.memberEmails.length === 1 ? 'member' : 'members'}`
            : ''}
          . Library progress stays.
        </p>
        {deleteError && (
          <Banner tone="warning" icon="alert">
            {deleteError}
          </Banner>
        )}
      </Dialog>

      <Dialog
        open={confirmLeave}
        onClose={() => !leaving && setConfirmLeave(false)}
        title={`Leave “${plan.title}”?`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmLeave(false)} disabled={leaving}>
              Cancel
            </Button>
            <Button
              variant="danger-solid"
              icon="logout"
              loading={leaving}
              onClick={() => void handleLeave()}
            >
              Leave plan
            </Button>
          </>
        }
      >
        <p>
          You’ll lose access to this plan. Your own library progress stays. To come back, ask{' '}
          {plan.ownerName} to invite you again.
        </p>
        {leaveError && (
          <Banner tone="warning" icon="alert">
            {leaveError}
          </Banner>
        )}
      </Dialog>

      {toast && (
        <Toast
          icon={toast.undo ? undefined : toast.error ? 'alert' : 'check'}
          actionLabel={toast.undo ? 'Undo' : undefined}
          actionIcon="undo"
          onAction={() => {
            toast.undo?.()
            hideToast()
          }}
        >
          {toast.text}
        </Toast>
      )}
    </article>
  )
}

/** A marathon has no series poster: use the first movie's. */
function firstMoviePoster(sessions: PlanSession[] | null) {
  return sessions?.[0]?.units[0]?.media?.posterPath ?? null
}

function peopleLine(
  ownerName: string,
  members: { email: string; role: keyof typeof ROLE_LABELS }[],
  role: PlanRole,
): string {
  if (role === 'link') return `by ${ownerName}`
  const shown = members
    .slice(0, 3)
    .map((m) => `${memberName(m.email)} (${ROLE_LABELS[m.role].toLowerCase()})`)
  const more = members.length - shown.length
  return [`Owner: ${ownerName}`, ...shown, ...(more > 0 ? [`${more} more`] : [])].join(' · ')
}

function WeeksSkeleton() {
  return (
    <div className={styles.weeks} aria-busy="true" aria-label="Loading sessions">
      {[0, 1].map((w) => (
        <div key={w} className={styles.week}>
          <Skeleton width={160} height={16} />
          <Skeleton height={64} radius="md" />
          <Skeleton height={64} radius="md" />
          <Skeleton height={64} radius="md" />
        </div>
      ))}
    </div>
  )
}

function PlanSkeleton() {
  return (
    <section className={styles.page} aria-busy="true" aria-label="Loading plan">
      <div className={styles.header}>
        <Skeleton width={112} ratio="2 / 3" radius="sm" />
        <div className={styles.heading}>
          <Skeleton width="30%" height={16} />
          <Skeleton width="60%" height={40} />
          <Skeleton width="50%" height={12} radius="pill" />
        </div>
      </div>
      <WeeksSkeleton />
    </section>
  )
}
