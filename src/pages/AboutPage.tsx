import { Trans, useTranslation } from 'react-i18next'
import Card from '../components/Card/Card'
import type { IconName } from '../components/Icon/icons'
import Icon from '../components/Icon/Icon'
import styles from './AboutPage.module.css'

const FEATURES: { icon: IconName; id: 'heatmap' | 'planner' | 'sharing' }[] = [
  { icon: 'heat', id: 'heatmap' },
  { icon: 'calendar', id: 'planner' },
  { icon: 'users', id: 'sharing' },
]

export default function AboutPage() {
  const { t } = useTranslation('home')
  return (
    <div className={styles.page}>
      <title>{t('about.pageTitle')}</title>

      <section className={styles.intro} aria-labelledby="about-title">
        <p className={styles.kicker}>{t('about.kicker')}</p>
        <h1 id="about-title" className={styles.title}>
          {t('about.title')}
        </h1>
        <p className={styles.lead}>{t('about.lead')}</p>
      </section>

      <section aria-labelledby="features-title">
        <h2 id="features-title" className="sr-only">
          {t('about.features')}
        </h2>
        <ul className={styles.features}>
          {FEATURES.map((feature) => (
            <Card as="li" key={feature.id} className={styles.feature}>
              <span className={styles.featureIcon}>
                <Icon name={feature.icon} size={22} />
              </span>
              <h3 className={styles.featureTitle}>{t(`about.${feature.id}Title`)}</h3>
              <p className={styles.muted}>{t(`about.${feature.id}Text`)}</p>
            </Card>
          ))}
        </ul>
      </section>

      {/* TMDB's terms ask apps to credit them; the footer has a short version on every page. */}
      <Card className={styles.credit}>
        <Icon name="info" size={22} className={styles.creditIcon} />
        <p>
          <Trans
            t={t}
            i18nKey="about.credit"
            components={{
              tmdb: <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer" />,
            }}
          />
        </p>
      </Card>
    </div>
  )
}
