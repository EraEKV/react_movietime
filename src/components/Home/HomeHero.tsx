import { imageUrl } from '../../api/tmdb'
import type { SeriesListItem } from '../../types/tmdb'
import ButtonLink from '../ButtonLink/ButtonLink'
import ProgressRing from '../ProgressRing/ProgressRing'
import styles from './Home.module.css'

interface HomeHeroProps {
  /** This week's trending series; their posters fill the stack. null while loading. */
  series: SeriesListItem[] | null
}

/** Landing for guests: the pitch on the left, a fanned stack of real posters on the right. */
export default function HomeHero({ series }: HomeHeroProps) {
  const posters = (series ?? []).filter((s) => s.poster_path).slice(0, 3)
  const featured = posters[0]

  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.pitch}>
        <p className={styles.kicker}>Your evening programme</p>
        <h1 id="hero-title" className={styles.heroTitle}>
          Stop asking “what do we watch tonight?”
        </h1>
        <p className={styles.heroText}>
          Find a series, see which episodes are worth it, and turn it into a watch schedule you
          share with friends.
        </p>
        <div className={styles.heroActions}>
          <ButtonLink to="/series" variant="primary" size="lg" icon="compass">
            Explore titles
          </ButtonLink>
          <ButtonLink to="/signup" size="lg" icon="calendar">
            Start planning
          </ButtonLink>
        </div>
      </div>

      {/* Decoration only: an example of a planned evening, hidden from screen readers. */}
      <div className={styles.stack} aria-hidden="true">
        {[0, 1, 2].map((i) => {
          const item = posters[i]
          const src = item ? imageUrl(item.poster_path, 'w342') : null
          return (
            <div key={i} className={styles.stackPoster}>
              {src && <img src={src} alt="" />}
            </div>
          )
        })}
        {featured && (
          <div className={styles.tonight}>
            <ProgressRing value={0.4} size={40} />
            <div>
              <strong>Tonight 21:00</strong>
              <span>{featured.name} · S1E1–2</span>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
