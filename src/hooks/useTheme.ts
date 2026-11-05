import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import {
  selectResolvedTheme,
  selectThemePreference,
  systemThemeChanged,
  themeChanged,
} from '../store/preferencesSlice'

const LIGHT_QUERY = '(prefers-color-scheme: light)'

/** Keeps the store in sync with the OS theme. Mount once, at the app root. */
export function useSystemThemeSync() {
  const dispatch = useAppDispatch()

  useEffect(() => {
    const media = window.matchMedia(LIGHT_QUERY)
    const handleChange = () => dispatch(systemThemeChanged(media.matches ? 'light' : 'dark'))
    media.addEventListener('change', handleChange)
    // Cleanup: no listener left behind if the root ever unmounts (and in StrictMode re-runs).
    return () => media.removeEventListener('change', handleChange)
  }, [dispatch])
}

/** Current theme and actions for UI controls (header toggle, settings). */
export function useTheme() {
  const dispatch = useAppDispatch()
  const preference = useAppSelector(selectThemePreference)
  const theme = useAppSelector(selectResolvedTheme)

  return {
    preference,
    theme,
    setTheme: (next: typeof preference) => dispatch(themeChanged(next)),
    /** The header toggle picks the opposite of what is on screen, overriding 'system'. */
    toggleTheme: () => dispatch(themeChanged(theme === 'dark' ? 'light' : 'dark')),
  }
}
