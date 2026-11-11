import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { User } from 'firebase/auth'
import type { AuthError, AuthStatus, AuthUser, UserAvatar } from '../types/auth'
import { loadAuthService } from '../services/loadAuthService'
import { toAuthError } from '../utils/firebaseErrors'
import { takeRedirectMark } from '../utils/signInMode'
import type { RootState } from './store'

/** Which button started the request, so only that one shows a spinner. */
export type AuthPending = 'email' | 'google' | 'signOut' | 'verify' | null

export interface AuthState {
  user: AuthUser | null
  /** 'loading' until Firebase reports the restored session (or its absence) once. */
  status: AuthStatus
  pending: AuthPending
  error: AuthError | null
  /** The avatar chosen in settings, kept in step with the profile by a listener. */
  avatar: UserAvatar | null
}

const initialState: AuthState = {
  user: null,
  status: 'loading',
  pending: null,
  error: null,
  avatar: null,
}

// Typed once: thunks get RootState in getState() and AuthError as the rejected payload.
const createAuthThunk = createAsyncThunk.withTypes<{
  state: RootState
  rejectValue: AuthError
}>()

/**
 * Makes sure `users/{uid}` exists. A failure here (offline, rules not deployed) must not
 * undo a successful sign-in, so it is reported and swallowed.
 */
async function syncProfile(user: User, state: RootState) {
  const { theme, language } = state.preferences
  try {
    // Dynamic import: the Firestore SDK is downloaded only when someone actually signs in,
    // not on every page load (see services/firestore.ts).
    const { ensureProfile } = await import('../services/profileService')
    await ensureProfile(user, { theme, language })
  } catch (error) {
    console.warn('Could not save the profile', error)
  }
}

export const signIn = createAuthThunk(
  'auth/signIn',
  async (form: { email: string; password: string }, { getState, rejectWithValue }) => {
    try {
      const authService = await loadAuthService()
      const user = await authService.signInWithEmail(form.email, form.password)
      await syncProfile(user, getState())
      return authService.toAuthUser(user)
    } catch (error) {
      return rejectWithValue(toAuthError(error))
    }
  },
)

export const signUp = createAuthThunk(
  'auth/signUp',
  async (
    form: { displayName: string; email: string; password: string },
    { getState, rejectWithValue },
  ) => {
    try {
      const authService = await loadAuthService()
      const user = await authService.signUpWithEmail(form.displayName, form.email, form.password)
      await syncProfile(user, getState())
      // updateProfile doesn't change the token, so the auth listener never sees the new
      // name; the fulfilled payload carries it into the store instead.
      return authService.toAuthUser(user)
    } catch (error) {
      return rejectWithValue(toAuthError(error))
    }
  },
)

export const signInWithGoogle = createAuthThunk(
  'auth/google',
  async (_: void, { getState, rejectWithValue }) => {
    try {
      const authService = await loadAuthService()
      const user = await authService.signInWithGoogle()
      // A redirect leaves the page: the spinner stays until the browser navigates away, and
      // the result is handled by completeGoogleRedirect when the app loads again.
      if (user === 'redirecting') return await new Promise<never>(() => {})
      await syncProfile(user, getState())
      return authService.toAuthUser(user)
    } catch (error) {
      return rejectWithValue(toAuthError(error))
    }
  },
)

/**
 * First thing after the app loads again from Google: finishes the redirect sign-in, creates
 * the profile like the popup flow does, or reports the failure on the form. `pending` stays
 * 'google' meanwhile, so the login page doesn't redirect before the profile exists.
 * Does nothing (and doesn't touch Firebase) unless a redirect was started on this device.
 */
export const completeGoogleRedirect = createAuthThunk(
  'auth/google/redirect',
  async (_: void, { getState, rejectWithValue }) => {
    if (!takeRedirectMark()) return null // Nothing was started here: not an error.
    try {
      const authService = await loadAuthService()
      const user = await authService.finishGoogleRedirect()
      // A redirect was started but nothing came back (storage blocked between the app and
      // the auth domain, or the result landed in another browser context): say so instead
      // of leaving the login page as if nothing had happened.
      if (!user) {
        // What to look at when this shows up: the page's host against the auth domain (they
        // must be the same site) and whether this is the installed app.
        console.warn('Google redirect returned without a user', {
          host: location.host,
          authDomain: authService.configuredAuthDomain(),
          standalone: matchMedia('(display-mode: standalone)').matches,
        })
        return rejectWithValue(toAuthError({ code: 'app/google-redirect-incomplete' }))
      }
      await syncProfile(user, getState())
      return authService.toAuthUser(user)
    } catch (error) {
      return rejectWithValue(toAuthError(error))
    }
  },
)

export const signOut = createAuthThunk('auth/signOut', async (_: void, { rejectWithValue }) => {
  try {
    const authService = await loadAuthService()
    await authService.signOutUser()
  } catch (error) {
    return rejectWithValue(toAuthError(error))
  }
})

export const resendVerification = createAuthThunk(
  'auth/resendVerification',
  async (_: void, { rejectWithValue }) => {
    try {
      const authService = await loadAuthService()
      await authService.resendVerification()
    } catch (error) {
      return rejectWithValue(toAuthError(error))
    }
  },
)

/**
 * New display name: saved in Firebase Auth (header, new lists and plans read it from there)
 * and in users/{uid} (the profile). Both are awaited — the settings form shows "Saving…"
 * and reports a failure. Offline the Firestore write would wait for the network, so the
 * form checks navigator.onLine first.
 */
export const updateDisplayName = createAuthThunk(
  'auth/updateDisplayName',
  async (name: string, { getState, rejectWithValue }) => {
    const uid = getState().auth.user?.uid
    try {
      const authService = await loadAuthService()
      if (!uid) throw new Error('Not signed in')
      const { updateUserProfile } = await import('../services/profileService')
      await Promise.all([
        authService.updateDisplayName(name),
        updateUserProfile(uid, { displayName: name }),
      ])
      return name
    } catch (error) {
      return rejectWithValue(toAuthError(error))
    }
  },
)

/** "I've verified": reloads the user; the refreshed token reaches the store via authChanged. */
export const refreshUser = createAuthThunk(
  'auth/refreshUser',
  async (_: void, { rejectWithValue }) => {
    try {
      const authService = await loadAuthService()
      const user = await authService.refreshUser()
      return user ? authService.toAuthUser(user) : null
    } catch (error) {
      return rejectWithValue(toAuthError(error))
    }
  },
)

const SIGN_IN_THUNKS = [signIn, signUp, signInWithGoogle] as const

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /** Dispatched by the Firebase subscription in listeners.ts on every auth/token change. */
    authChanged(state, action: PayloadAction<AuthUser | null>) {
      // Someone else (or nobody) is signed in now: their avatar arrives with their profile.
      if (action.payload?.uid !== state.user?.uid) state.avatar = null
      state.user = action.payload
      state.status = action.payload ? 'authenticated' : 'guest'
    },
    /** The profile listener's view of `users/{uid}.avatar`. */
    avatarSynced(state, action: PayloadAction<UserAvatar | null>) {
      state.avatar = action.payload
    },
    authErrorCleared(state) {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    // updateProfile() doesn't refresh the token, so authChanged never brings the new name;
    // the thunk's result does. Pending/error stay in the form (local to the settings page).
    builder.addCase(updateDisplayName.fulfilled, (state, action) => {
      if (state.user) state.user.displayName = action.payload
    })

    for (const thunk of SIGN_IN_THUNKS) {
      builder
        .addCase(thunk.pending, (state, action) => {
          state.pending = action.type.startsWith('auth/google') ? 'google' : 'email'
          state.error = null
        })
        .addCase(thunk.fulfilled, (state, action) => {
          state.pending = null
          state.user = action.payload
          state.status = 'authenticated'
        })
        .addCase(thunk.rejected, (state, action) => {
          state.pending = null
          state.error = action.payload ?? toAuthError(action.error)
        })
    }

    // Not in SIGN_IN_THUNKS: with no redirect pending the result is null and must not sign anyone out.
    builder
      .addCase(completeGoogleRedirect.pending, (state) => {
        state.pending = 'google'
      })
      .addCase(completeGoogleRedirect.fulfilled, (state, action) => {
        state.pending = null
        if (action.payload) {
          state.user = action.payload
          state.status = 'authenticated'
        }
      })
      .addCase(completeGoogleRedirect.rejected, (state, action) => {
        state.pending = null
        state.error = action.payload ?? toAuthError(action.error)
      })

    builder
      .addCase(signOut.pending, (state) => {
        state.pending = 'signOut'
      })
      .addCase(signOut.fulfilled, (state) => {
        state.pending = null
        state.error = null
      })
      .addCase(signOut.rejected, (state, action) => {
        state.pending = null
        state.error = action.payload ?? toAuthError(action.error)
      })

    for (const thunk of [resendVerification, refreshUser]) {
      builder
        .addCase(thunk.pending, (state) => {
          state.pending = 'verify'
          state.error = null
        })
        .addCase(thunk.fulfilled, (state) => {
          state.pending = null
        })
        .addCase(thunk.rejected, (state, action) => {
          state.pending = null
          state.error = action.payload ?? toAuthError(action.error)
        })
    }
  },
  selectors: {
    selectAuthUser: (state) => state.user,
    selectAuthStatus: (state) => state.status,
    selectAuthPending: (state) => state.pending,
    selectAuthError: (state) => state.error,
    selectAvatar: (state) => state.avatar,
  },
})

export const { authChanged, authErrorCleared, avatarSynced } = authSlice.actions
export const {
  selectAuthUser,
  selectAuthStatus,
  selectAuthPending,
  selectAuthError,
  selectAvatar,
} = authSlice.selectors
export default authSlice
