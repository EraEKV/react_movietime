import { episodeCode, formatRating, ratingTone } from '../../utils/format.js'
import styles from './EpisodeHeatmap.module.css'

function average(episodes) {
  const rated = episodes.filter((e) => e.rating !== null)
  if (rated.length === 0) return null
  return rated.reduce((sum, e) => sum + e.rating, 0) / rated.length
}

/**
 * SeriesGraph-style grid: one column per season, one row per episode number.
 * Seasons have different lengths, so shorter columns get empty cells.
 */
export default function HeatmapGrid({ seasons, selectedId, onSelect }) {
  const maxEpisodes = Math.max(...seasons.map((s) => s.episodes.length))
  const rows = Array.from({ length: maxEpisodes }, (_, i) => i)

  return (
    <div className={styles.scroller}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col" className={styles.corner}>
              <span className={styles.srOnly}>Episode</span>
            </th>
            {seasons.map((season) => (
              <th key={season.number} scope="col" title={season.name}>
                S{season.number}
              </th>
            ))}
          </tr>
          <tr>
            <th scope="row" className={styles.rowHead}>
              Avg
            </th>
            {seasons.map((season) => {
              const avg = average(season.episodes)
              return (
                <td key={season.number}>
                  <span className={`${styles.cell} ${styles.avg}`} data-tone={ratingTone(avg)}>
                    {avg === null ? '—' : avg.toFixed(1)}
                  </span>
                </td>
              )
            })}
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

                return (
                  <td key={season.number}>
                    <button
                      type="button"
                      className={styles.cell}
                      data-tone={ratingTone(episode.rating)}
                      aria-pressed={episode.id === selectedId}
                      aria-label={`${episodeCode(episode.season, episode.number)} ${episode.name}, rating ${formatRating(episode.rating)}`}
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
      </table>
    </div>
  )
}
