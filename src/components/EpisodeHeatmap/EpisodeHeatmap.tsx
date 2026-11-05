import { useState } from 'react'
import { useEpisodeRatings, type Episode } from '../../hooks/useEpisodeRatings'
import { episodeCode } from '../../utils/format'
import { RATING_WORDS, type RatingStep } from '../../utils/rating'
import EmptyState from '../EmptyState/EmptyState'
import ErrorState from '../EmptyState/ErrorState'
import RatingBadge from '../RatingBadge/RatingBadge'
import Skeleton from '../Skeleton/Skeleton'
import EpisodePanel from './EpisodePanel'
import HeatmapGrid from './HeatmapGrid'
import styles from './EpisodeHeatmap.module.css'

const LEGEND: { step: RatingStep; range: string }[] = [
  { step: 1, range: '< 5' },
  { step: 2, range: '5–6.4' },
  { step: 3, range: '6.5–7.4' },
  { step: 4, range: '7.5–8.4' },
  { step: 5, range: '8.5+' },
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
    return (
      <div aria-busy="true" aria-label="Loading episode ratings">
        <Skeleton height={320} radius="md" />
      </div>
    )
  }

  if (status === 'error') {
    return (
      <ErrorState
        headingLevel="h3"
        title="We couldn’t load episode ratings"
        body={error.message}
        onRetry={reload}
      />
    )
  }

  const episodes = seasons.flatMap((season) => season.episodes)
  const rated = episodes.filter((e): e is Episode & { rating: number } => e.rating !== null)

  if (rated.length === 0) {
    return (
      <EmptyState
        icon="heat"
        headingLevel="h3"
        title="No episode ratings yet"
        body="Ratings appear after episodes air and TMDB users vote on them."
      />
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
        <HighlightButton label="★ Best" episode={best} onSelect={handleSelect} />
        {worst.id !== best.id && (
          <HighlightButton label="▼ Lowest" episode={worst} onSelect={handleSelect} />
        )}
        <p className={styles.stats}>
          {rated.length} of {episodes.length} episodes rated
        </p>
      </div>

      <HeatmapGrid
        seasons={seasons}
        selectedId={selectedId}
        bestId={best.id}
        worstId={worst.id === best.id ? null : worst.id}
        onSelect={handleSelect}
      />

      <ul className={styles.legend} aria-label="Rating colours">
        {LEGEND.map((item) => (
          <li key={item.step}>
            <span className={styles.swatch} data-step={item.step} />
            {RATING_WORDS[item.step]} {item.range}
          </li>
        ))}
        <li>
          <span className={styles.swatch} data-step={0} />
          Not aired
        </li>
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
        {episodeCode(episode.season, episode.number)} · {episode.name}
      </span>
      <RatingBadge value={episode.rating} />
    </button>
  )
}
