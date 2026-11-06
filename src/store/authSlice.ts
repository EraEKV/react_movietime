import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { User } from 'firebase/auth'
import * as authService from '../services/authService'
import type { AuthError, AuthStatus, AuthUser } from '../types/auth'
import { toAuthError } from '../utils/firebaseErrors'
import type { RootState } from './store'

/** Which button started the request, so only that one shows a spinner. */
export type AuthPending = 'email' | 'google' | 'signOut' | 'verify' | null

export interface AuthState {
  user: AuthUser | null
  /** 'loading' until Firebase reports the restored session (or its absence) once. */
  status: AuthStatus
  pending: AuthPending
  error: AuthError | null
}

const initialState: AuthState = { user: null, status: 'loading', pending: null, error: null }

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
      const user = await authService.signInWithGoogle()
      await syncProfile(user, getState())
      return authService.toAuthUser(user)
    } catch (error) {
      return rejectWithValue(toAuthError(error))
    }
  },
)

export const signOut = createAuthThunk('auth/signOut', async (_: void, { rejectWithValue }) => {
  try {
    await authService.signOutUser()
  } catch (error) {
    return rejectWithValue(toAuthError(error))
  }
})

export const resendVerification = createAuthThunk(
  'auth/resendVerification',
  async (_: void, { rejectWithValue }) => {
    try {
      await authService.resendVerification()
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
      state.user = action.payload
      state.status = action.payload ? 'authenticated' : 'guest'
    },
    authErrorCleared(state) {
      state.error = null
    },
  },
  extraReducers: (builder) => {
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
  },
})

export const { authChanged, authErrorCleared } = authSlice.actions
export const { selectAuthUser, selectAuthStatus, selectAuthPending, selectAuthError } =
  authSlice.selectors
export default authSlice
