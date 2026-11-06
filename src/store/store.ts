import { configureStore, type ThunkAction, type UnknownAction } from '@reduxjs/toolkit'
import authSlice from './authSlice'
import librarySlice from './librarySlice'
import { listenerMiddleware } from './listenerMiddleware'
import preferencesSlice from './preferencesSlice'

export const store = configureStore({
  reducer: {
    [authSlice.name]: authSlice.reducer,
    [librarySlice.name]: librarySlice.reducer,
    [preferencesSlice.name]: preferencesSlice.reducer,
  },
  // The listener middleware goes first: its add/remove actions carry functions,
  // which the default serializability check would otherwise flag.
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().prepend(listenerMiddleware.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

/** A thunk that may await (dynamic imports, Firestore) and returns R. */
export type AppThunk<R = Promise<void>> = ThunkAction<R, RootState, unknown, UnknownAction>
