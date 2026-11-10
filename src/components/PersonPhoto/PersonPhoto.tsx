import { useState } from 'react'
import { imageUrl } from '../../shared/api/tmdb'
import Icon from '../../shared/ui/Icon/Icon'
import styles from './PersonPhoto.module.css'

interface PersonPhotoProps {
  /** TMDB `profile_path`; null when the person has no photo. */
  path: string | null
  size: 'w92' | 'w185' | 'w342'
  /** Alt text; empty when a neighbouring link already names the person. */
  alt?: string
  iconSize?: number
}

/**
 * A person's photo that never shows the browser's broken-image icon: without a photo, or when
 * the image fails to load (blocked CDN, offline, deleted file), a neutral silhouette takes its
 * place. The parent supplies the frame (size, ratio, background); this fills it.
 */
export default function PersonPhoto({ path, size, alt = '', iconSize = 32 }: PersonPhotoProps) {
  // The failed path, not a flag: a new path (other person in the same slot) tries again.
  const [failedPath, setFailedPath] = useState<string | null>(null)
  const src = imageUrl(path, size)

  if (src && failedPath !== path) {
    return <img src={src} alt={alt} loading="lazy" onError={() => setFailedPath(path)} />
  }
  return (
    <span className={styles.fallback} data-testid="person-photo-fallback" aria-hidden="true">
      <Icon name="user" size={iconSize} />
    </span>
  )
}
