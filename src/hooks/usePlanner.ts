import { useMemo } from 'react'
import type * as PlannerService from '../services/plannerService'
import type { Plan, PlannedSession, PlanRole, PlanSession } from '../types/plan'
import { addDays, localToday, monthGrid, type MonthRef } from '../utils/calendar'
import { bySchedule } from '../utils/schedule'
import { normalizeEmail, roleOf } from '../utils/sharing'
import { useAuth } from './useAuth'
import { useListAuthor } from './useLists'
import { useSubscription } from '../shared/hooks/useSubscription'
import { offlineMessage } from '../utils/listErrors'

// Plans live in page hooks, not in Redux (like lists): only the planner pages, Home and the
// header chip need them, and every Firestore listener closes with the component using it.

/** Loaded on first use: keeps the service and the Firestore SDK out of the main chunk. */
export const loadPlannerService = (): Promise<typeof PlannerService> =>
  import('../services/plannerService')

const NO_PLANS: Plan[] = []

const isPermissionDenied = (error: Error) =>
  'code' in error && (error as { code: unknown }).code === 'permission-denied'

export type PlansState =
  | { status: 'idle' | 'loading'; plans: null; error: null; retry: () => void }
  | { status: 'error'; plans: null; error: Error; retry: () => void }
  | { status: 'success'; plans: Plan[]; error: null; retry: () => void }

/**
 * My plans and plans shared with me, live, merged into one list (soonest next session
 * first). Shared ones need a verified email — the rules would reject the query otherwise —
 * so for unverified users that half simply stays empty.
 */
export function usePlans(): PlansState & { sharedIds: Set<string> } {
  const { user } = useAuth()
  const uid = user?.uid ?? null
  const email = user?.emailVerified && user.email ? normalizeEmail(user.email) : null

  const mine = useSubscription<Plan[]>(uid && `my-plans:${uid}`, async (onData, onError) =>
    (await loadPlannerService()).watchMyPlans(uid ?? '', onData, onError),
  )
  const shared = useSubscription<Plan[]>(
    email && `shared-plans:${email}`,
    async (onData, onError) =>
      (await loadPlannerService()).watchSharedPlans(email ?? '', onData, onError),
  )

  const retry = () => {
    mine.retry()
    shared.retry()
  }
  const sharedData = shared.status === 'idle' ? NO_PLANS : shared.data
  const plans = useMemo(() => {
    if (!mine.data || !sharedData) return null
    const own = new Set(mine.data.map((p) => p.id))
    return [...mine.data, ...sharedData.filter((p) => !own.has(p.id))].toSorted(
      (a, b) =>
        (a.nextDate ?? '9999').localeCompare(b.nextDate ?? '9999') ||
        a.title.localeCompare(b.title),
    )
  }, [mine.data, sharedData])
  const sharedIds = useMemo(() => new Set(sharedData?.map((p) => p.id)), [sharedData])

  if (mine.status === 'idle') return { status: 'idle', plans: null, error: null, retry, sharedIds }
  const error = mine.error ?? shared.error
  if (error) return { status: 'error', plans: null, error, retry, sharedIds }
  if (!plans) return { status: 'loading', plans: null, error: null, retry, sharedIds }
  return { status: 'success', plans, error: null, retry, sharedIds }
}

type SessionsByPlan = Record<string, PlanSession[]>

/**
 * Sessions of several plans in a day range: one listener per plan (sessions live inside
 * each plan), combined into one result once every plan has answered. The key holds only
 * the plan ids and the range, so a plan's counters changing doesn't reopen the listeners.
 */
function useSessionsOf(plans: Plan[] | null, range: PlannerService.DayRange | null) {
  const ids = plans?.filter((p) => p.status !== 'archived').map((p) => p.id) ?? null
  const span = range ? `${range.from}:${range.to}` : 'all'
  const key = ids && `sessions:${ids.toSorted().join(',')}:${span}`
  const sessions = useSubscription<SessionsByPlan>(key, async (onData, onError) => {
    const service = await loadPlannerService()
    const found: SessionsByPlan = {}
    if (!ids || ids.length === 0) {
      onData({})
      return () => {}
    }
    const unsubscribes = ids.map((id) =>
      service.watchSessions(
        id,
        range,
        (list) => {
          found[id] = list
          if (Object.keys(found).length === ids.length) onData({ ...found })
        },
        onError,
      ),
    )
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe())
  })

  // Joined with the latest plan objects here, so a ring or a counter is never stale.
  const joined = useMemo<PlannedSession[] | null>(() => {
    if (!plans || !sessions.data) return null
    return plans
      .flatMap((plan) => (sessions.data[plan.id] ?? []).map((session) => ({ plan, session })))
      .toSorted(
        (a, b) => bySchedule(a.session, b.session) || a.session.time.localeCompare(b.session.time),
      )
  }, [plans, sessions.data])

  return { status: sessions.status, error: sessions.error, retry: sessions.retry, sessions: joined }
}

/** Today's and tomorrow's sessions of all my plans: Home "Up next" and the header chip. */
export function useUpcoming() {
  const plans = usePlans()
  const today = localToday()
  const sessions = useSessionsOf(plans.plans, { from: today, to: addDays(today, 1) })
  return { plans, today, ...sessions }
}

/**
 * The planner page: plans, the sessions of the visible month grid (including the days of
 * the neighbouring months it shows) and today's sessions for the side panel.
 */
export function usePlanner(month: MonthRef) {
  const plans = usePlans()
  const grid = monthGrid(month)
  const today = localToday()
  const visible = useSessionsOf(plans.plans, { from: grid[0] ?? today, to: grid.at(-1) ?? today })
  const todays = useSessionsOf(plans.plans, { from: today, to: today })
  return { plans, grid, today, visible, todays }
}

/**
 * The dashboard: plans and ALL their sessions (no date range), because the period filter,
 * "this week" and "upcoming" are all cut from the same list on the client. Plans hold tens
 * of sessions, so this stays small, and switching the period reopens no listeners.
 * Guests have no plans: usePlans stays idle and so does this.
 */
export function useDashboardPlans() {
  const plans = usePlans()
  const sessions = useSessionsOf(plans.plans, null)
  return { plans, ...sessions }
}

export type PlanState =
  | { status: 'loading'; retry: () => void }
  | { status: 'error'; error: Error; retry: () => void }
  | { status: 'missing'; retry: () => void }
  | {
      status: 'ready'
      plan: Plan
      sessions: PlanSession[] | null
      sessionsError: Error | null
      role: PlanRole
      retry: () => void
    }

/**
 * One plan and all its sessions, live, plus the visitor's role. Public page, like a list:
 * waits for auth and keys by who is reading (see useList).
 */
export function usePlan(id: string): PlanState {
  const { user, status } = useAuth()
  const reader = user ? `${user.uid}:${user.emailVerified ? 'v' : 'u'}` : 'guest'
  const plan = useSubscription<Plan | null>(
    status === 'loading' ? null : `plan:${id}:${reader}`,
    async (onData, onError) => (await loadPlannerService()).watchPlan(id, onData, onError),
  )
  // Sessions only after the plan is known to exist: one clean "not found" otherwise.
  const sessions = useSubscription<PlanSession[]>(
    plan.status === 'success' && plan.data ? `plan-sessions:${id}:${reader}` : null,
    async (onData, onError) =>
      (await loadPlannerService()).watchSessions(id, null, onData, onError),
  )
  const retry = () => {
    plan.retry()
    sessions.retry()
  }

  if (plan.status === 'idle' || plan.status === 'loading') return { status: 'loading', retry }
  if (plan.status === 'error') {
    return isPermissionDenied(plan.error)
      ? { status: 'missing', retry }
      : { status: 'error', error: plan.error, retry }
  }
  const role = plan.data ? roleOf(plan.data, user) : null
  if (!plan.data || !role) return { status: 'missing', retry }
  return {
    status: 'ready',
    plan: plan.data,
    sessions: sessions.status === 'success' ? sessions.data : null,
    sessionsError: sessions.status === 'error' ? sessions.error : null,
    role,
    retry,
  }
}

/**
 * Session actions bound to the signed-in user ("marked by"). Each resolves when the server
 * has the batch and rejects with the Firestore error; the caller shows it. Offline writes
 * are refused up front, because a batch would wait for the network without telling anyone.
 */
export function usePlanActions() {
  const author = useListAuthor()
  const run = async <T>(action: (service: typeof PlannerService) => Promise<T>) => {
    if (!navigator.onLine) throw new Error(offlineMessage())
    return action(await loadPlannerService())
  }
  const by = () => {
    if (!author) throw new Error('Sign in to change sessions.')
    return author
  }
  return {
    complete: (plan: Plan, session: PlanSession) =>
      run((s) => s.completeSession(plan, session, by())),
    skip: (plan: Plan, session: PlanSession) => run((s) => s.skipSession(plan, session, by())),
    undo: (plan: Plan, session: PlanSession) => run((s) => s.undoSession(plan, session)),
    reschedule: (plan: Plan, session: PlanSession, date: string, shiftLater: boolean) =>
      run((s) => s.rescheduleSession(plan, session, date, shiftLater)),
  }
}
