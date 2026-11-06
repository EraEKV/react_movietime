/**
 * A one-line notice passed to the next page through history state:
 * `navigate('/lists', { state: { notice: 'List deleted' } })`. The state is untyped
 * (anything can be in history), so it is checked before use.
 */
export function noticeFromState(state: unknown): string | null {
  if (typeof state !== 'object' || state === null || !('notice' in state)) return null
  return typeof state.notice === 'string' ? state.notice : null
}
