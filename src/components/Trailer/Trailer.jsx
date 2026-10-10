import { useState } from 'react'
import styles from './Trailer.module.css'

/**
 * Shows the YouTube thumbnail first and only loads the player after a click,
 * so the detail page doesn't pull in YouTube's heavy iframe up front.
 *
 * `isPlaying` is local UI state. The parent page renders this subtree with
 * key={seriesId}, so opening another series resets it instead of autoplaying.
 */
export default function Trailer({ video, title }) {
  const [isPlaying, setIsPlaying] = useState(false)

  if (isPlaying) {
    return (
      <div className={styles.frame}>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${video.key}?autoplay=1`}
          title={`${title} — ${video.name}`}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  }

  return (
    <button
      type="button"
      className={styles.frame}
      onClick={() => setIsPlaying(true)}
      aria-label={`Play trailer: ${video.name}`}
    >
      <img src={`https://i.ytimg.com/vi/${video.key}/hqdefault.jpg`} alt="" loading="lazy" />
      <span className={styles.play} aria-hidden="true">
        ▶
      </span>
      <span className={styles.caption}>{video.name}</span>
    </button>
  )
}
