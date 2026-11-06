import { useCallback, useMemo } from 'react'
import {
  authErrorCleared,
  refreshUser,
  resendVerification,
  selectAuthError,
  selectAuthPending,
  selectAuthStatus,
  selectAuthUser,
  signIn,
  signInWithGoogle,
  signOut,
  signUp,
  updateDisplayName,
} from '../store/authSlice'
import { useAppDispatch, useAppSelector } from '../store/hooks'

/**
 * The one door to auth for components: current user + actions.
 * Actions resolve to `true` on success, so a form can move on (redirect, "check your email")
 * without reading the store's internals. Failures land in `error`.
 */
export function useAuth() {
  const dispatch = useAppDispatch()
  const user = useAppSelector(selectAuthUser)
  const status = useAppSelector(selectAuthStatus)
  const pending = useAppSelector(selectAuthPending)
  const error = useAppSelector(selectAuthError)

  const clearError = useCallback(() => {
    dispatch(authErrorCleared())
  }, [dispatch])

  // useMemo keeps the object stable between renders, so it is safe in effect dependencies.
  const actions = useMemo(
    () => ({
      signIn: async (email: string, password: string) =>
        signIn.fulfilled.match(await dispatch(signIn({ email, password }))),
      signUp: async (displayName: string, email: string, password: string) =>
        signUp.fulfilled.match(await dispatch(signUp({ displayName, email, password }))),
      signInWithGoogle: async () =>
        signInWithGoogle.fulfilled.match(await dispatch(signInWithGoogle())),
      signOut: async () => signOut.fulfilled.match(await dispatch(signOut())),
      /** Resolves to null on success, or the error to show under the field. */
      updateDisplayName: async (name: string) => {
        const result = await dispatch(updateDisplayName(name))
        return updateDisplayName.fulfilled.match(result)
          ? null
          : (result.payload ?? { code: 'unknown', message: 'Couldn’t save the name' })
      },
      resendVerification: async () =>
        resendVerification.fulfilled.match(await dispatch(resendVerification())),
      /** Resolves to the reloaded user (null on failure), to check `emailVerified` right away. */
      refreshUser: async () => {
        const result = await dispatch(refreshUser())
        return refreshUser.fulfilled.match(result) ? result.payload : null
      },
    }),
    [dispatch],
  )

  return {
    user,
    status,
    isAuthenticated: status === 'authenticated',
    pending,
    error,
    clearError,
    ...actions,
  }
}
