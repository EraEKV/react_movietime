import i18n from '../shared/i18n'
/** A Firestore write error → a sentence for the user. */
export function listErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : null
  if (code === 'permission-denied') return i18n.t('lists:errors.permission')
  if (code === 'not-found') return i18n.t('lists:errors.notFound')
  return i18n.t('errors.saveFailed')
}

/** Writes wait for the server (to show a real result), so refuse early when offline. */
export const offlineMessage = () => i18n.t('errors.offline')
