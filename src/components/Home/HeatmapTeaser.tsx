import { useEpisodeRatings } from '../../hooks/useEpisodeRatings'
import ButtonLink from '../ButtonLink/ButtonLink'
import Card from '../Card/Card'
import HeatmapGrid from '../EpisodeHeatmap/HeatmapGrid'
import Skeleton from '../Skeleton/Skeleton'
import styles from './Home.module.css'

// A well-known series with a telling heatmap. Defined outside the component, so the
// seasons array is created once and not on every render.
const FEATURED = { id: 1396, name: 'Breaking Bad' }
const SEASONS = [1, 2, 3, 4]
const EPISODES_SHOWN = 6

/** Explains the heatmap with a real preview: the first episodes of a few seasons. */
export default function HeatmapTeaser() {
  const ratings = useEpisodeRatings(FEATURED.id, SEASONS)
  const href = `/series/${FEATURED.id}`

  const seasons =
    ratings.status === 'success'
      ? ratings.seasons.map((s) => ({ ...s, episodes: s.episodes.slice(0, EPISODES_SHOWN) }))
      : null

  return (
    <section className={styles.teaserSection} aria-labelledby="heatmap-teaser-title">
      <Card className={styles.teaser}>
        <div className={styles.teaserText}>
          <p className={styles.kicker}>Episode heatmap</p>
          <h2 id="heatmap-teaser-title" className={styles.teaserTitle}>
            Know which episodes are worth it
          </h2>
          <p className={styles.muted}>
            Every season at a glance — find the slump in season 3, the finale everyone talks about,
            and where to start a rewatch.
          </p>
          <div>
            <ButtonLink to={href} icon="heat">
              See {FEATURED.name}
            </ButtonLink>
          </div>
        </div>

        {/* The preview is optional: on an error the text and the link above still work,
            so the slot stays empty instead of showing a second error on the page.
            `inert` turns the grid into an illustration: its cells are buttons on the series
            page, here they would only add ~24 Tab stops before the next section. */}
        {seasons && (
          <div className={styles.teaserGrid} inert aria-hidden="true">
            <HeatmapGrid
              seasons={seasons}
              selectedId={null}
              bestId={null}
              worstId={null}
              onSelect={() => {}}
            />
          </div>
        )}
        {ratings.status === 'loading' && (
          <div className={styles.teaserGrid}>
            <Skeleton width={280} height={260} radius="sm" />
          </div>
        )}
      </Card>
    </section>
  )
}
