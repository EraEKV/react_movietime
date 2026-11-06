import { useTranslation } from 'react-i18next'
import ButtonLink from '../shared/ui/ButtonLink/ButtonLink'
import type { IconName } from '../shared/ui/Icon/icons'
import styles from './SystemPage.module.css'

interface NotFoundPageProps {
  /** Detail pages reuse it for "this list doesn't exist" with their own words. */
  title?: string
  text?: string
  secondary?: { to: string; label: string; icon: IconName }
}

export default function NotFoundPage({ title: customTitle, text, secondary }: NotFoundPageProps) {
  const { t } = useTranslation()
  const title = customTitle ?? t('notFound.title')
  const link = secondary ?? { to: '/library', label: t('notFound.library'), icon: 'bookmark' }
  return (
    <section className={styles.page} aria-labelledby="not-found-title">
      <title>{t('notFound.pageTitle', { title })}</title>
      <p className={styles.code} aria-hidden="true">
        404
      </p>
      <h1 id="not-found-title" className={styles.title}>
        {title}
      </h1>
      <p className={styles.text}>{text ?? t('notFound.text')}</p>
      <div className={styles.actions}>
        <ButtonLink to="/" variant="primary" icon="home">
          {t('notFound.home')}
        </ButtonLink>
        <ButtonLink to={link.to} icon={link.icon}>
          {link.label}
        </ButtonLink>
      </div>
    </section>
  )
}
