import { useState, type SyntheticEvent } from 'react'

/**
 * Tells whether an `<img>` could not load, so the caller can show a stand-in instead of the
 * browser's broken-image icon (a poster that 404s, or one that was never cached offline).
 * The failure belongs to one address: a different `src` starts clean, no effect needed.
 */
export function useImageFailed(src: string | null | undefined): {
  failed: boolean
  onError: (event: SyntheticEvent<HTMLImageElement>) => void
} {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  return {
    failed: !src || failedSrc === src,
    onError: () => setFailedSrc(src ?? null),
  }
}
