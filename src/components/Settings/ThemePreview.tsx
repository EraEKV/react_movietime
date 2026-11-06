import type { ThemePreference } from '../../types/preferences'
import styles from './Settings.module.css'

/**
 * A tiny drawing of the app in a theme. `data-theme` on the wrapper re-scopes every colour
 * token inside it, so the preview uses the real theme colours, not copies of them.
 * "System" shows both halves: it follows the device.
 */
export default function ThemePreview({ theme }: { theme: ThemePreference }) {
  if (theme === 'system') {
    return (
      <span className={styles.previewSplit} aria-hidden="true">
        <Mini theme="light" />
        <Mini theme="dark" />
      </span>
    )
  }
  return (
    <span className={styles.previewFrame} aria-hidden="true">
      <Mini theme={theme} />
    </span>
  )
}

function Mini({ theme }: { theme: 'light' | 'dark' }) {
  return (
    <span className={styles.preview} data-theme={theme}>
      <span className={styles.previewTitle} />
      <span className={styles.previewRow}>
        <span className={styles.previewPoster} />
        <span className={styles.previewPoster} />
        <span className={styles.previewPoster} />
        <span className={styles.previewButton} />
      </span>
    </span>
  )
}
