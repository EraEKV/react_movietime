import { configureStore } from '@reduxjs/toolkit'
import { listenerMiddleware } from './listenerMiddleware'
import preferencesSlice from './preferencesSlice'

export const store = configureStore({
  reducer: {
    [preferencesSlice.name]: preferencesSlice.reducer,
  },
  // The listener middleware goes first: its add/remove actions carry functions,
  // which the default serializability check would otherwise flag.
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().prepend(listenerMiddleware.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
