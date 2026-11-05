import { useState } from 'react'
import { useEpisodeRatings, type Episode } from '../../hooks/useEpisodeRatings'
import type { RatingTone } from '../../utils/format'
import Button from '../Button/Button'
import RatingBadge from '../RatingBadge/RatingBadge'
import StatusMessage from '../StatusMessage/StatusMessage'
import EpisodePanel from './EpisodePanel'
import HeatmapGrid from './HeatmapGrid'
import styles from './EpisodeHeatmap.module.css'

const LEGEND: { tone: RatingTone; label: string }[] = [
  { tone: 'awesome', label: '9+' },
  { tone: 'great', label: '8–9' },
  { tone: 'good', label: '7–8' },
  { tone: 'ok', label: '5.5–7' },
  { tone: 'bad', label: '< 5.5' },
  { tone: 'none', label: 'Not rated' },
]

interface EpisodeHeatmapProps {
  seriesId: number | string
  seasonNumbers: number[]
}

export default function EpisodeHeatmap({ seriesId, seasonNumbers }: EpisodeHeatmapProps) {
  const { status, seasons, error, reload } = useEpisodeRatings(seriesId, seasonNumbers)

  // Store only the id; the episode object is derived from loaded data on each render,
  // so it can never get out of sync with it.
  const [selectedId, setSelectedId] = useState<number | null>(null)

  if (status === 'idle' || status === 'loading') {
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
  const rated = episodes.filter((e): e is Episode & { rating: number } => e.rating !== null)

  if (rated.length === 0) {
    return (
      <StatusMessage title="No episode ratings yet">
        Episodes appear here once TMDB users start voting on them.
      </StatusMessage>
    )
  }

  // rated is non-empty here, so reduce without an initial value is safe.
  const best = rated.reduce((a, b) => (b.rating > a.rating ? b : a))
  const worst = rated.reduce((a, b) => (b.rating < a.rating ? b : a))
  const selected = episodes.find((e) => e.id === selectedId) ?? null

  // Clicking the selected cell again closes the panel.
  function handleSelect(id: number) {
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

interface HighlightButtonProps {
  label: string
  episode: Episode
  onSelect: (id: number) => void
}

function HighlightButton({ label, episode, onSelect }: HighlightButtonProps) {
  return (
    <button type="button" className={styles.highlight} onClick={() => onSelect(episode.id)}>
      <span className={styles.highlightLabel}>{label}</span>
      <span className={styles.highlightName}>
        S{episode.season}E{episode.number} · {episode.name}
      </span>
      <RatingBadge value={episode.rating} />
    </button>
  )
}
