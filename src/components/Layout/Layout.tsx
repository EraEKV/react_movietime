import { Trans, useTranslation } from 'react-i18next'
import { Suspense, useEffect } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import { useSystemThemeSync } from '../../hooks/useTheme'
import VerifyEmailBanner from '../auth/VerifyEmailBanner'
import LibraryNotice from '../Library/LibraryNotice'
import PageLoader from '../PageLoader/PageLoader'
import Header from './Header'
import styles from './Layout.module.css'
import TabBar from './TabBar'

export default function Layout() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  useSystemThemeSync()

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
            <Routes>, so only the page area shows the skeleton. Router navigations run in a
            transition, so later page switches keep the old page until the new one is ready. */}
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>

      <footer className={styles.footer}>
        <p>
          <Link to="/about">{t('layout.about')}</Link> ·{' '}
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
