/**
 * Firebase Auth (~110 kB with firebase/app) is loaded with import(), not as part of the main
 * bundle: the first screen renders without waiting for it, and auth.status stays 'loading'
 * until the SDK restores the session (UserMenu shows a placeholder, guards wait).
 * import() of the same module resolves once — every caller shares the downloaded chunk.
 */
export const loadAuthService = () => import('./authService')
