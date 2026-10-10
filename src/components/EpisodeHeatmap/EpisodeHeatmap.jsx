import { useState } from 'react'
import { useEpisodeRatings } from '../../hooks/useEpisodeRatings.js'
import Button from '../Button/Button.jsx'
import RatingBadge from '../RatingBadge/RatingBadge.jsx'
import StatusMessage from '../StatusMessage/StatusMessage.jsx'
import EpisodePanel from './EpisodePanel.jsx'
import HeatmapGrid from './HeatmapGrid.jsx'
import styles from './EpisodeHeatmap.module.css'

const LEGEND = [
  { tone: 'awesome', label: '9+' },
  { tone: 'great', label: '8–9' },
  { tone: 'good', label: '7–8' },
  { tone: 'ok', label: '5.5–7' },
  { tone: 'bad', label: '< 5.5' },
  { tone: 'none', label: 'Not rated' },
]

export default function EpisodeHeatmap({ seriesId, seasonNumbers }) {
  const { status, seasons, error, reload } = useEpisodeRatings(seriesId, seasonNumbers)

  // Store only the id; the episode object is derived from loaded data on each render,
  // so it can never get out of sync with it.
  const [selectedId, setSelectedId] = useState(null)

  if (status === 'loading') {
    return <div className={styles.loading} aria-busy="true" aria-label="Loading episode ratings" />
  }

  if (status === 'error') {
    return (
      <StatusMessage
        tone="error"
        title="Couldn't load episode ratings"
        action={<Button onClick={reload}>Try again</Button>}
      >
        {error.message}
      </StatusMessage>
    )
  }

  const episodes = seasons.flatMap((season) => season.episodes)
  const rated = episodes.filter((e) => e.rating !== null)

  if (rated.length === 0) {
    return (
      <StatusMessage title="No episode ratings yet">
        Episodes appear here once TMDB users start voting on them.
      </StatusMessage>
    )
  }

  const best = rated.reduce((a, b) => (b.rating > a.rating ? b : a))
  const worst = rated.reduce((a, b) => (b.rating < a.rating ? b : a))
  const selected = episodes.find((e) => e.id === selectedId) ?? null

  // Clicking the selected cell again closes the panel.
  function handleSelect(id) {
    setSelectedId((current) => (current === id ? null : id))
  }

  return (
    <div className={styles.heatmap}>
      <div className={styles.highlights}>
        <HighlightButton label="Best episode" episode={best} onSelect={handleSelect} />
        {worst.id !== best.id && (
          <HighlightButton label="Lowest rated" episode={worst} onSelect={handleSelect} />
        )}
        <p className={styles.stats}>
          {rated.length} of {episodes.length} episodes rated
        </p>
      </div>

      <HeatmapGrid seasons={seasons} selectedId={selectedId} onSelect={handleSelect} />

      <ul className={styles.legend} aria-label="Rating colors">
        {LEGEND.map((item) => (
          <li key={item.tone}>
            <span className={styles.swatch} data-tone={item.tone} />
            {item.label}
          </li>
        ))}
      </ul>

      {selected ? (
        <EpisodePanel episode={selected} onClose={() => setSelectedId(null)} />
      ) : (
        <p className={styles.hint}>Select an episode to see its details.</p>
      )}
    </div>
  )
}

function HighlightButton({ label, episode, onSelect }) {
  return (
    <button type="button" className={styles.highlight} onClick={() => onSelect(episode.id)}>
      <span className={styles.highlightLabel}>{label}</span>
      <span className={styles.highlightName}>
        S{episode.season}E{episode.number} · {episode.name}
      </span>
      <RatingBadge vote={episode.rating} size="sm" />
    </button>
  )
}
