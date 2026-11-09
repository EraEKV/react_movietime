import { useTranslation } from 'react-i18next'
import styles from './PrivacyPage.module.css'

const SECTIONS = ['data', 'calendar', 'tokens', 'third', 'delete', 'contact'] as const

/** /privacy: the policy Google asks for before the Calendar scope can go to production. */
export default function PrivacyPage() {
  const { t } = useTranslation('home', { keyPrefix: 'privacy' })
  return (
    <div className={styles.page}>
      <title>{t('pageTitle')}</title>
      <header className={styles.intro}>
        <p className={styles.kicker}>{t('kicker')}</p>
        <h1 className={styles.title}>{t('title')}</h1>
        <p className={styles.lead}>{t('lead')}</p>
        <p className={styles.muted}>{t('updated')}</p>
      </header>
      {SECTIONS.map((id) => (
        <section key={id} aria-labelledby={`privacy-${id}`} className={styles.section}>
          <h2 id={`privacy-${id}`} className={styles.heading}>
            {t(`sections.${id}.title`)}
          </h2>
          <p>{t(`sections.${id}.text`)}</p>
        </section>
      ))}
    </div>
  )
}
