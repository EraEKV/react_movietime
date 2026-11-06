import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation('home')
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
          <p className={styles.kicker}>{t('teaser.kicker')}</p>
          <h2 id="heatmap-teaser-title" className={styles.teaserTitle}>
            {t('teaser.title')}
          </h2>
          <p className={styles.muted}>{t('teaser.text')}</p>
          <div>
            <ButtonLink to={href} icon="heat">
              {t('teaser.see', { name: FEATURED.name })}
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
