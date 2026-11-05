import { createListenerMiddleware } from '@reduxjs/toolkit'
import type { AppDispatch, RootState } from './store'

export const listenerMiddleware = createListenerMiddleware()

// Pre-typed so effects get RootState from getState() and AppDispatch from dispatch.
export const startAppListening = listenerMiddleware.startListening.withTypes<
  RootState,
  AppDispatch
>()
