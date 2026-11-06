import Card from '../components/Card/Card'
import type { IconName } from '../components/Icon/icons'
import Icon from '../components/Icon/Icon'
import styles from './AboutPage.module.css'

const FEATURES: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'heat',
    title: 'Episode heatmap',
    text: 'Every episode of a series, coloured by rating. Spot the strong seasons and the slumps before you commit.',
  },
  {
    icon: 'calendar',
    title: 'Watch planner',
    text: 'Pick a series or a list, choose your evenings, and get a schedule with a finish date.',
  },
  {
    icon: 'users',
    title: 'Sharing',
    text: 'Share lists and plans by link, or invite friends as editors or viewers. Everyone marks progress together.',
  },
]

export default function AboutPage() {
  return (
    <div className={styles.page}>
      <title>About · Movietime</title>

      <section className={styles.intro} aria-labelledby="about-title">
        <p className={styles.kicker}>About Movietime</p>
        <h1 id="about-title" className={styles.title}>
          A personal cinema schedule for you and your friends
        </h1>
        <p className={styles.lead}>
          Movietime helps you discover movies and series, keep a library of what you watch, and plan
          viewing nights that actually happen. Discover → save → plan → watch → track.
        </p>
      </section>

      <section aria-labelledby="features-title">
        <h2 id="features-title" className="sr-only">
          Features
        </h2>
        <ul className={styles.features}>
          {FEATURES.map((feature) => (
            <Card as="li" key={feature.title} className={styles.feature}>
              <span className={styles.featureIcon}>
                <Icon name={feature.icon} size={22} />
              </span>
              <h3 className={styles.featureTitle}>{feature.title}</h3>
              <p className={styles.muted}>{feature.text}</p>
            </Card>
          ))}
        </ul>
      </section>

      {/* TMDB's terms ask apps to credit them; the footer has a short version on every page. */}
      <Card className={styles.credit}>
        <Icon name="info" size={22} className={styles.creditIcon} />
        <p>
          Movie and series data and images are provided by{' '}
          <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer">
            TMDB
          </a>
          . Movietime uses the TMDB API but is not endorsed or certified by TMDB.
        </p>
      </Card>
    </div>
  )
}
