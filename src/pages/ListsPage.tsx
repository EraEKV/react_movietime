import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'
import Banner from '../components/Banner/Banner'
import ButtonLink from '../components/ButtonLink/ButtonLink'
import EmptyState from '../components/EmptyState/EmptyState'
import ErrorState from '../components/EmptyState/ErrorState'
import ListCard from '../components/ListCard/ListCard'
import ListCardSkeleton from '../components/ListCard/ListCardSkeleton'
import ListGrid from '../components/ListCard/ListGrid'
import SectionHeader from '../components/SectionHeader/SectionHeader'
import Toast from '../components/Toast/Toast'
import { useMyLists, useSharedLists } from '../hooks/useLists'
import { useTimedState } from '../hooks/useTimedState'
import { titlesCount } from '../utils/lists'
import { noticeFromState } from '../shared/lib/notice'
import styles from './ListsPage.module.css'

const SKELETONS = 3

export default function ListsPage() {
  const { t } = useTranslation(['lists', 'common'])
  const lists = useMyLists()
  const shared = useSharedLists()
  const location = useLocation()
  // "Deleted …" from the list page, passed through history state.
  const [notice] = useTimedState<string>(5000, noticeFromState(location.state))

  let body
  if (lists.status === 'error') {
    body = (
      <ErrorState
        title={t('loadError')}
        body={lists.error.message}
        onRetry={lists.retry}
        headingLevel="h3"
      />
    )
  } else if (lists.status !== 'success') {
    body = (
      <div aria-busy="true" aria-label={t('loadingLists')}>
        <ListGrid>
          {Array.from({ length: SKELETONS }, (_, i) => (
            <li key={i}>
              <ListCardSkeleton />
            </li>
          ))}
        </ListGrid>
      </div>
    )
  } else if (lists.data.length === 0) {
    body = (
      <EmptyState
        icon="list"
        title={t('emptyTitle')}
        body={t('emptyBody')}
        headingLevel="h3"
        actions={
          <ButtonLink to="/lists/new" variant="primary" icon="plus">
            {t('createFirst')}
          </ButtonLink>
        }
      />
    )
  } else {
    body = (
      <ListGrid label={t('myLists')}>
        {lists.data.map((list) => (
          <li key={list.id}>
            <ListCard list={list} />
          </li>
        ))}
      </ListGrid>
    )
  }

  const total = lists.status === 'success' ? lists.data.length : null
  const items = lists.status === 'success' ? lists.data.reduce((n, l) => n + l.itemCount, 0) : 0

  return (
    <section className={styles.page} aria-labelledby="lists-title">
      <title>{t('pageTitle')}</title>

      <header className={styles.header}>
        <div>
          <h1 id="lists-title" className={styles.title}>
            {t('title')}
          </h1>
          <p className={styles.subtitle}>
            {total === null ? ' ' : `${t('listsCount', { count: total })} · ${titlesCount(items)}`}
          </p>
        </div>
        <ButtonLink to="/lists/new" variant="primary" icon="plus">
          {t('new')}
        </ButtonLink>
      </header>

      <section aria-labelledby="my-lists">
        <SectionHeader id="my-lists" title={t('myLists')} />
        {body}
      </section>
      <section aria-labelledby="shared-lists">
        <SectionHeader id="shared-lists" title={t('sharedWithMe')} />
        <SharedLists shared={shared} />
      </section>

      {notice && <Toast icon="check">{notice}</Toast>}
    </section>
  )
}

function SharedLists({ shared }: { shared: ReturnType<typeof useSharedLists> }) {
  const { t } = useTranslation('lists')
  // Rules give member access only to verified emails, so there is nothing to query yet.
  if (shared.needsVerification) {
    return (
      <Banner
        tone="warning"
        action={
          <ButtonLink to="/verify-email" size="sm">
            {t('verifyEmail')}
          </ButtonLink>
        }
      >
        {t('verifyBanner')}
      </Banner>
    )
  }
  if (shared.status === 'error') {
    return (
      <ErrorState
        title={t('sharedError')}
        body={shared.error.message}
        onRetry={shared.retry}
        headingLevel="h3"
      />
    )
  }
  if (shared.status !== 'success') {
    return (
      <div aria-busy="true" aria-label={t('loadingShared')}>
        <ListGrid>
          <li>
            <ListCardSkeleton />
          </li>
        </ListGrid>
      </div>
    )
  }
  if (shared.data.length === 0) {
    return <p className={styles.sharedEmpty}>{t('sharedEmpty', { email: shared.email })}</p>
  }
  const email = shared.email ?? ''
  return (
    <ListGrid label={t('sharedWithMe')}>
      {shared.data.map((list) => (
        <li key={list.id}>
          <ListCard list={list} role={list.roles[email] ?? 'viewer'} />
        </li>
      ))}
    </ListGrid>
  )
}
