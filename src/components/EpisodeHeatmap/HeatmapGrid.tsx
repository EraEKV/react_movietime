import type { Episode, Season } from '../../hooks/useEpisodeRatings'
import { episodeCode } from '../../utils/format'
import { RATING_WORDS, ratingStep } from '../../utils/rating'
import styles from './EpisodeHeatmap.module.css'

function average(episodes: Episode[]): number | null {
  const ratings = episodes.map((e) => e.rating).filter((r): r is number => r !== null)
  if (ratings.length === 0) return null
  return ratings.reduce((sum, r) => sum + r, 0) / ratings.length
}

function cellLabel(episode: Episode, mark: string): string {
  const rating =
    episode.rating === null
      ? 'not rated'
      : `rated ${episode.rating.toFixed(1)}, ${RATING_WORDS[ratingStep(episode.rating)]}`
  return `${episodeCode(episode.season, episode.number)}, ${episode.name}, ${rating}${mark}`
}

/**
 * One column per season, one row per episode number.
 * Seasons have different lengths, so shorter columns get empty cells.
 * The number is printed in every cell: colour is never the only signal.
 */
interface HeatmapGridProps {
  seasons: Season[]
  selectedId: number | null
  bestId: number | null
  worstId: number | null
  onSelect: (id: number) => void
}

export default function HeatmapGrid({
  seasons,
  selectedId,
  bestId,
  worstId,
  onSelect,
}: HeatmapGridProps) {
  const maxEpisodes = Math.max(...seasons.map((s) => s.episodes.length))
  const rows = Array.from({ length: maxEpisodes }, (_, i) => i)

  return (
    <div className={styles.scroller}>
      <table className={styles.table}>
        <caption className="sr-only">Episode ratings by season</caption>
        <thead>
          <tr>
            <th scope="col" className={styles.corner}>
              <span className="sr-only">Episode</span>
            </th>
            {seasons.map((season) => (
              <th key={season.number} scope="col" title={season.name}>
                S{season.number}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            // Row index *is* the identity here: row 0 is always "episode 1".
            <tr key={row}>
              <th scope="row" className={styles.rowHead}>
                E{row + 1}
              </th>
              {seasons.map((season) => {
                const episode = season.episodes[row]
                if (!episode) return <td key={season.number} />

                const mark = episode.id === bestId ? '★' : episode.id === worstId ? '▼' : undefined
                const markLabel = mark === '★' ? ', best episode' : mark ? ', lowest rated' : ''
                return (
                  <td key={season.number}>
                    <button
                      type="button"
                      className={styles.cell}
                      data-step={ratingStep(episode.rating)}
                      data-mark={mark}
                      aria-pressed={episode.id === selectedId}
                      aria-label={cellLabel(episode, markLabel)}
                      title={`${episodeCode(episode.season, episode.number)} · ${episode.name}`}
                      onClick={() => onSelect(episode.id)}
                    >
                      {episode.rating === null ? '—' : episode.rating.toFixed(1)}
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" className={styles.rowHead}>
              Avg
            </th>
            {seasons.map((season) => {
              const avg = average(season.episodes)
              return (
                <td key={season.number} className={styles.avg}>
                  {avg === null ? '—' : avg.toFixed(1)}
                </td>
              )
            })}
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
