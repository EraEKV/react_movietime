import i18n from '../shared/i18n'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { imageUrl } from '../shared/api/tmdb'
import AvatarStack from '../shared/ui/AvatarStack/AvatarStack'
import { RoleBadge, VisibilityBadge } from '../components/ListCard/ListBadges'
import Banner from '../shared/ui/Banner/Banner'
import Button from '../shared/ui/Button/Button'
import { buttonClass } from '../shared/ui/Button/variants'
import ButtonLink from '../shared/ui/ButtonLink/ButtonLink'
import Dialog from '../shared/ui/Dialog/Dialog'
import EmptyState from '../shared/ui/EmptyState/EmptyState'
import ErrorState from '../shared/ui/EmptyState/ErrorState'
import Icon from '../shared/ui/Icon/Icon'
import IconButton from '../shared/ui/IconButton/IconButton'
import type { IconName } from '../shared/ui/Icon/icons'
import Menu from '../shared/ui/Menu/Menu'
import RescheduleDialog from '../components/Planner/RescheduleDialog'
import ReorderFilmsDialog from '../components/Planner/ReorderFilmsDialog'
import PlanTitle from '../components/Planner/PlanTitle'
import MarathonVotes from '../components/Planner/MarathonVotes'
import ProposalsPanel from '../components/Planner/ProposalsPanel'
import SessionRow from '../components/Planner/SessionRow'
import WatchDisclosure from '../components/WhereToWatch/WatchDisclosure'
import SuggestFilmDialog from '../components/Planner/SuggestFilmDialog'
import ProgressBar from '../shared/ui/ProgressBar/ProgressBar'
import ShareDialog from '../components/ShareDialog/ShareDialog'
import Skeleton from '../shared/ui/Skeleton/Skeleton'
import Toast from '../shared/ui/Toast/Toast'
import { useAuth } from '../hooks/useAuth'
import { useListAuthor } from '../hooks/useLists'
import { canVote, useMarathonVotes, useVoteActions } from '../hooks/useMarathonVotes'
import { loadPlannerService, usePlan, usePlanActions } from '../hooks/usePlanner'
import { useSharing } from '../hooks/useSharing'
import { useTimedState } from '../shared/hooks/useTimedState'
import { useImageFailed } from '../shared/hooks/useImageFailed'
import type { Plan, PlanRole, PlanSession } from '../types/plan'
import { formatDay, localToday } from '../utils/calendar'
import { offlineMessage } from '../utils/listErrors'
import { noticeFromState } from '../shared/lib/notice'
import {
  canEditSessions,
  planErrorMessage,
  planProgress,
  scheduleLabel,
  unitWord,
} from '../utils/planner'
import { loginPath } from '../shared/lib/redirect'
import { likesOf, myProposal, openProposals } from '../utils/marathonVotes'
import { groupByWeek, toIcs, unitsLabel, weekLabel } from '../utils/schedule'
import { memberName, membersOf, roleLabel, shareUrl } from '../utils/sharing'
import type { MemberRole } from '../types/sharing'
import NotFoundPage from './NotFoundPage'
import styles from './PlanPage.module.css'

export default function PlanPage() {
  const { id = '' } = useParams()
  // A key per plan: moving between plans starts with fresh dialogs and toasts.
  return <PlanView key={id} id={id} />
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
  const { t } = useTranslation(['planner', 'common', 'lists'])
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const author = useListAuthor()
  const state = usePlan(id)
  const actions = usePlanActions()
  const sharing = useSharing(
    'plans',
    state.status === 'ready' ? state.plan : null,
    state.status === 'ready' ? state.plan.title : '',
  )
  const votes = useMarathonVotes(
    state.status === 'ready' ? state.plan : null,
    state.status === 'ready' ? state.role : null,
  )
  const voteActions = useVoteActions()
  const today = localToday()

  // One film picker for three jobs: a member's suggestion, the owner's replacement, a new film.
  const [picking, setPicking] = useState<
    { mode: 'suggest' | 'replace'; session: PlanSession } | { mode: 'add' } | null
  >(null)
  const [moving, setMoving] = useState<PlanSession | null>(null)
  const [reordering, setReordering] = useState(false)
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
      ? t('lists:page.hintGuest')
      : !user.emailVerified
        ? t('lists:page.hintUnverified')
        : ''
    return (
      <NotFoundPage
        title={t('plan.missingTitle')}
        text={`${t('plan.missingBody')}${hint}`}
        secondary={
          user
            ? { to: '/planner', label: t('plan.goPlanner'), icon: 'calendar' }
            : { to: loginPath(location.pathname), label: t('plan.signIn'), icon: 'user' }
        }
      />
    )
  }
  if (state.status === 'error') {
    return (
      <div className={styles.page}>
        <ErrorState title={t('plan.loadError')} body={state.error.message} onRetry={state.retry} />
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
    if (!navigator.onLine) return setDeleteError(offlineMessage())
    setDeleting(true)
    setDeleteError(null)
    try {
      await (await loadPlannerService()).deletePlan(plan.id)
      navigate('/planner', {
        replace: true,
        state: { notice: t('plan.deleted', { title: plan.title }) },
      })
    } catch (error) {
      setDeleting(false)
      setDeleteError(planErrorMessage(error))
    }
  }

  async function handleLeave() {
    if (!navigator.onLine) return setLeaveError(offlineMessage())
    setLeaving(true)
    setLeaveError(null)
    try {
      await sharing.leave()
      navigate('/planner', {
        replace: true,
        state: { notice: t('plan.left', { title: plan.title }) },
      })
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
  const weeks = groupByWeek(sessions ?? [])
  const pendingCopy = (s: PlanSession) =>
    sessions?.some((c) => c.copyOf === s.id && c.status === 'pending') ?? false

  // A movie marathon's remaining films can be reordered by whoever may edit the plan.
  const pendingFilms = sessions?.filter((s) => s.status === 'pending') ?? []
  const canReorder =
    plan.kind === 'list' && (role === 'owner' || role === 'editor') && pendingFilms.length > 1

  const offers = role === 'owner' && sessions ? openProposals(sessions, votes.proposals) : []

  let actionsBar
  if (role === 'owner') {
    actionsBar = (
      <>
        <Button variant="primary" icon="share" onClick={() => setShareOpen(true)}>
          {t('plan.share')}
        </Button>
        {plan.kind === 'list' && (
          <Button icon="plus" onClick={() => setPicking({ mode: 'add' })}>
            {t('votes.add')}
          </Button>
        )}
        {canReorder && (
          <Button icon="list" onClick={() => setReordering(true)}>
            {t('plan.reorder')}
          </Button>
        )}
        <Button
          icon="download"
          disabled={!sessions}
          onClick={() => sessions && downloadIcs(plan, sessions)}
        >
          {t('plan.export')}
        </Button>
        <IconButton
          icon="trash"
          label={t('plan.delete')}
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
          {t('plan.export')}
        </Button>
        {(role === 'editor' || role === 'viewer') && (
          <Menu
            label={t('plan.more')}
            align="right"
            triggerClassName={buttonClass('secondary', 'md', { iconOnly: true })}
            trigger={<Icon name="more" size={20} />}
            items={[
              ...(canReorder
                ? [
                    {
                      label: t('plan.reorder'),
                      icon: 'list' as const,
                      onSelect: () => setReordering(true),
                    },
                  ]
                : []),
              {
                label: t('plan.leave'),
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
        title={t('plan.sessionsError')}
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
        {weeks.map(([monday, list]) => (
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
                    t('plan.marked', { units: unitsLabel(s.units) }),
                  )}
                  onSkip={act(
                    () => actions.skip(plan, s),
                    t('plan.skippedToast', { units: unitsLabel(s.units) }),
                    // Undo needs the skipped state, which the snapshot brings; the service
                    // re-reads sessions, so passing the old object with the new status is enough.
                    () => actions.undo(plan, { ...s, status: 'skipped' }),
                  )}
                  onUndo={act(() => actions.undo(plan, s))}
                  onReschedule={() => setMoving(s)}
                  watchHere={plan.kind !== 'series'}
                  extra={
                    s.status === 'pending' && plan.kind === 'list' ? (
                      <MarathonVotes
                        session={s}
                        likes={likesOf(s, votes.likes)}
                        ownUid={user?.uid ?? null}
                        ownerName={plan.ownerName}
                        canLike={canVote(plan, role)}
                        canSuggest={canVote(plan, role) && role !== 'owner'}
                        canReplace={role === 'owner'}
                        mine={myProposal(s, votes.proposals, user?.uid ?? null)}
                        onLike={(on) => act(() => voteActions.like(plan, s, on))()}
                        onSuggest={() => setPicking({ mode: 'suggest', session: s })}
                        onReplace={() => setPicking({ mode: 'replace', session: s })}
                        onWithdraw={act(
                          () => voteActions.withdraw(plan, `${s.id}_${user?.uid ?? ''}`),
                          t('votes.toast.withdrawn'),
                        )}
                      />
                    ) : undefined
                  }
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
      <title>{t('common:ui.pageTitle', { title: plan.title })}</title>
      <ButtonLink
        to={user ? '/planner' : '/'}
        variant="ghost"
        icon="chevron-left"
        className={styles.back}
      >
        {user ? t('plan.backPlanner') : t('plan.backHome')}
      </ButtonLink>

      {role === 'viewer' && (
        <Banner>
          {t(plan.kind === 'list' ? 'votes.viewerBanner' : 'plan.viewerBanner', {
            owner: plan.ownerName,
          })}
        </Banner>
      )}
      {role === 'link' && (
        <Banner>{user ? t('plan.linkBannerUser') : t('plan.linkBannerGuest')}</Banner>
      )}

      <header className={styles.header}>
        <PlanPoster src={poster} icon={plan.kind === 'series' ? 'tv' : 'film'} />
        <div className={styles.heading}>
          <span className={styles.kickerRow}>
            <span
              className={styles.dot}
              style={{ background: `var(--plan-${plan.color})` }}
              aria-hidden="true"
            />
            <span className={styles.kicker}>
              {t('plan.kicker', {
                schedule: scheduleLabel(plan.options),
              })}
            </span>
          </span>
          <PlanTitle
            title={plan.title}
            canRename={role === 'owner'}
            onRename={async (name) => {
              await actions.rename(plan, name)
              showToast({ text: t('plan.renamed', { title: name }) })
            }}
          />
          <div className={styles.progress}>
            <ProgressBar
              value={progress}
              label={t('plan.progress')}
              caption={t(plan.status === 'done' ? 'plan.captionDone' : 'plan.captionOpen', {
                done: plan.doneUnits,
                total: unitWord(plan, plan.totalUnits),
                date: plan.endDate
                  ? formatDay(plan.endDate, { weekday: 'short', month: 'short', day: 'numeric' })
                  : '—',
              })}
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

      {plan.kind === 'series' && plan.media && !finished && (
        <WatchDisclosure mediaType="tv" tmdbId={plan.media.tmdbId} />
      )}

      {finished && (
        <EmptyState
          icon="check"
          headingLevel="h2"
          title={t('plan.finishedTitle')}
          body={t(plan.kind === 'series' ? 'plan.finishedSeries' : 'plan.finishedBody')}
          actions={
            role !== 'link' && plan.kind === 'series' && plan.media ? (
              <ButtonLink
                to={`/planner/new?series=${plan.media.tmdbId}`}
                variant="primary"
                icon="plus"
              >
                {t('plan.next')}
              </ButtonLink>
            ) : undefined
          }
        />
      )}

      {role === 'owner' && sessions && offers.length > 0 && (
        <ProposalsPanel
          offers={offers}
          onDecide={(proposal, session, accept) =>
            act(
              () =>
                voteActions.decide(plan, proposal, session, votes.proposals, votes.likes, accept),
              accept
                ? t('votes.toast.accepted', {
                    film: proposal.unit.title,
                    current: session.units[0]?.title ?? '',
                  })
                : t('votes.toast.rejected'),
            )()
          }
        />
      )}

      {body}

      {picking && sessions && (
        <SuggestFilmDialog
          {...pickerTexts(picking, plan.ownerName)}
          existing={new Set(sessions.flatMap((s) => s.units.map((u) => u.mediaKey)))}
          onClose={() => setPicking(null)}
          onSend={async (tmdbId) => {
            try {
              const unit = await voteActions.loadFilm(tmdbId)
              if (picking.mode === 'add') {
                const date = await actions.addFilm(plan, unit)
                showToast({
                  text: t('votes.toast.added', {
                    film: unit.title,
                    date: formatDay(date, { weekday: 'short', month: 'short', day: 'numeric' }),
                  }),
                })
              } else if (picking.mode === 'replace') {
                await voteActions.replace(plan, picking.session, unit, votes.proposals, votes.likes)
                showToast({
                  text: t('votes.toast.replaced', {
                    film: unit.title,
                    current: picking.session.units[0]?.title ?? '',
                  }),
                })
              } else {
                await voteActions.suggest(plan, picking.session, unit)
                showToast({ text: t('votes.toast.sent', { owner: plan.ownerName }) })
              }
            } catch (error) {
              throw new Error(planErrorMessage(error), { cause: error })
            }
          }}
        />
      )}

      {moving && sessions && (
        <RescheduleDialog
          session={moving}
          sessions={sessions}
          today={today}
          onClose={() => setMoving(null)}
          onMove={async (date, shiftLater, time) => {
            try {
              await actions.reschedule(plan, moving, date, shiftLater, time)
              showToast({
                text: t('plan.moved', {
                  units: unitsLabel(moving.units),
                  date: formatDay(date, { weekday: 'short', month: 'short', day: 'numeric' }),
                }),
              })
            } catch (error) {
              throw new Error(planErrorMessage(error), { cause: error })
            }
          }}
        />
      )}

      {reordering && canReorder && (
        <ReorderFilmsDialog
          sessions={pendingFilms}
          onClose={() => setReordering(false)}
          onSave={async (order) => {
            try {
              await actions.reorderFilms(plan, order)
              showToast({ text: t('plan.reordered') })
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
          inviteLink={sharing.inviteLink}
          onSendInvite={sharing.sendInviteEmail}
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
        title={t('plan.deleteTitle')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)} disabled={deleting}>
              {t('plan.keep')}
            </Button>
            <Button
              variant="danger-solid"
              icon="trash"
              loading={deleting}
              onClick={() => void handleDelete()}
            >
              {t('plan.delete')}
            </Button>
          </>
        }
      >
        <p>
          {plan.memberEmails.length > 0
            ? t('plan.deleteBodyShared', {
                sessions: t('common:count.sessions', { count: sessions?.length ?? 0 }),
                members: t('members', { count: plan.memberEmails.length }),
              })
            : t('plan.deleteBody', {
                sessions: t('common:count.sessions', { count: sessions?.length ?? 0 }),
              })}
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
        title={t('plan.leaveTitle', { title: plan.title })}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmLeave(false)} disabled={leaving}>
              {t('common:actions.cancel')}
            </Button>
            <Button
              variant="danger-solid"
              icon="logout"
              loading={leaving}
              onClick={() => void handleLeave()}
            >
              {t('plan.leave')}
            </Button>
          </>
        }
      >
        <p>{t('plan.leaveBody', { owner: plan.ownerName })}</p>
        {leaveError && (
          <Banner tone="warning" icon="alert">
            {leaveError}
          </Banner>
        )}
      </Dialog>

      {toast && (
        <Toast
          icon={toast.undo ? undefined : toast.error ? 'alert' : 'check'}
          actionLabel={toast.undo ? t('common:actions.undo') : undefined}
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

/** The picker's words for each of its three jobs. */
/** The plan's poster; the kind's icon stands in when there is none or it does not load. */
function PlanPoster({ src, icon }: { src: string | null; icon: IconName }) {
  const image = useImageFailed(src)
  return (
    <span className={styles.poster} aria-hidden="true">
      {image.failed ? (
        <Icon name={icon} size={28} />
      ) : (
        <img src={src ?? ''} alt="" onError={image.onError} />
      )}
    </span>
  )
}

function pickerTexts(
  picking: { mode: 'suggest' | 'replace'; session: PlanSession } | { mode: 'add' },
  ownerName: string,
) {
  if (picking.mode === 'add') {
    return {
      title: i18n.t('planner:votes.dialog.addTitle'),
      body: i18n.t('planner:votes.dialog.addBody'),
      submitLabel: i18n.t('planner:votes.dialog.addSubmit'),
    }
  }
  const { session } = picking
  const film = session.units[0]?.title ?? ''
  const date = formatDay(session.date, { weekday: 'short', month: 'short', day: 'numeric' })
  return picking.mode === 'replace'
    ? {
        title: i18n.t('planner:votes.dialog.replaceTitle', { date }),
        body: i18n.t('planner:votes.dialog.replaceBody', { film }),
        submitLabel: i18n.t('planner:votes.dialog.replaceSubmit'),
      }
    : {
        title: i18n.t('planner:votes.dialog.title', { date }),
        body: i18n.t('planner:votes.dialog.body', { film, owner: ownerName }),
        submitLabel: i18n.t('planner:votes.dialog.submit'),
      }
}

/** A marathon has no series poster: use the first movie's. */
function firstMoviePoster(sessions: PlanSession[] | null) {
  return sessions?.[0]?.units[0]?.media?.posterPath ?? null
}

function peopleLine(
  ownerName: string,
  members: { email: string; role: MemberRole }[],
  role: PlanRole,
): string {
  if (role === 'link') return i18n.t('lists:page.byOwner', { owner: ownerName })
  const shown = members.slice(0, 3).map((m) =>
    i18n.t('lists:page.memberRole', {
      name: memberName(m.email),
      role: roleLabel(m.role).toLowerCase(),
    }),
  )
  const more = members.length - shown.length
  return [
    i18n.t('lists:page.owner', { owner: ownerName }),
    ...shown,
    ...(more > 0 ? [i18n.t('lists:page.more', { count: more })] : []),
  ].join(' · ')
}

function WeeksSkeleton() {
  const { t } = useTranslation('planner')
  return (
    <div className={styles.weeks} aria-busy="true" aria-label={t('plan.loadingSessions')}>
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
  const { t } = useTranslation('planner')
  return (
    <section className={styles.page} aria-busy="true" aria-label={t('plan.loading')}>
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
