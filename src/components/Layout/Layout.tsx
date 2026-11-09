import { Trans, useTranslation } from 'react-i18next'
import { useEffect } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import { useCalendarAutoSync } from '../../hooks/useCalendarSync'
import { useSystemThemeSync } from '../../hooks/useTheme'
import VerifyEmailBanner from '../auth/VerifyEmailBanner'
import LibraryNotice from '../Library/LibraryNotice'
import Header from './Header'
import PageSuspense from './PageSuspense'
import styles from './Layout.module.css'
import TabBar from './TabBar'

export default function Layout() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  useSystemThemeSync()
  useCalendarAutoSync()

  // Syncs the browser's scroll position (an external system) with the route:
  // opening another page starts at the top. Filter/page changes keep the same pathname.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className={styles.shell}>
      <a href="#main" className={styles.skipLink}>
        {t('layout.skip')}
      </a>
      <Header />

      {/* tabIndex=-1 lets the skip link move focus here without adding a Tab stop. */}
      <main id="main" tabIndex={-1} className={styles.main}>
        <div className={styles.notices}>
          <VerifyEmailBanner />
        </div>
        {/* Lazy pages suspend while their chunk downloads. The boundary is here, not around
            <Routes>, so only the page area shows the skeleton, and it is keyed by the path
            so every navigation shows it (see PageSuspense). */}
        <PageSuspense>
          <Outlet />
        </PageSuspense>
      </main>

      <footer className={styles.footer}>
        <p>
          <Link to="/about">{t('layout.about')}</Link> ·{' '}
          <Link to="/privacy">{t('layout.privacy')}</Link> ·{' '}
          {/* Trans puts a real link inside a translated sentence: <tmdb>…</tmdb> in the text. */}
          <Trans
            i18nKey="layout.footer"
            components={{
              tmdb: <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer" />,
            }}
          />
        </p>
      </footer>

      <TabBar />
      <LibraryNotice />
    </div>
  )
}
