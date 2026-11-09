import { useTranslation } from 'react-i18next'
import { useRef, type KeyboardEvent } from 'react'
import { createSearchParams, Link } from 'react-router'
import { useTitleSearch } from '../../hooks/useTitleSearch'
import { imageUrl } from '../../shared/api/tmdb'
import { cx } from '../../shared/lib/cx'
import { getYear } from '../../shared/lib/format'
import Button from '../../shared/ui/Button/Button'
import Icon from '../../shared/ui/Icon/Icon'
import Skeleton from '../../shared/ui/Skeleton/Skeleton'
import styles from './Layout.module.css'

const MAX_RESULTS = 6

interface HeaderSearchResultsProps {
  query: string
  /** The catalog "All results" opens: movies on a movies page, series elsewhere. */
  catalog: '/movies' | '/series'
  /** `popover` hangs under the field in the bar; `sheet` spans the width under the header. */
  variant: 'popover' | 'sheet'
  /** A result was chosen: the caller clears and closes the search. */
  onPick: () => void
  /** ArrowUp on the first result: the caller puts focus back in the field. */
  onExitUp: () => void
}

/**
 * Titles that match what is typed in the header, as cards with a poster: movies and series
 * together (the same search the "add to list" picker uses). Enter in the field still opens the
 * full catalog search; this is the quick way to jump straight to a title.
 */
export default function HeaderSearchResults({
  query,
  catalog,
  variant,
  onPick,
  onExitUp,
}: HeaderSearchResultsProps) {
  const { t } = useTranslation(['common', 'library'])
  const search = useTitleSearch(query)
  const panel = useRef<HTMLDivElement>(null)

  if (search.tooShort) return null

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    const links = [...(panel.current?.querySelectorAll<HTMLAnchorElement>('a') ?? [])]
    const index = links.indexOf(document.activeElement as HTMLAnchorElement)
    if (index < 0) return
    event.preventDefault()
    if (event.key === 'ArrowDown') links[Math.min(index + 1, links.length - 1)]?.focus()
    else if (index === 0) onExitUp()
    else links[index - 1]?.focus()
  }

  let body
  if (search.pending || search.status === 'loading') {
    body = (
      <ul className={styles.resultsList} aria-busy="true" aria-label={t('header.searching')}>
        {Array.from({ length: 3 }, (_, i) => (
          <li key={i} className={styles.resultSkeleton}>
            <Skeleton width={36} height={54} radius="xs" />
            <Skeleton width="55%" height={16} />
          </li>
        ))}
      </ul>
    )
  } else if (search.status === 'error') {
    body = (
      <div className={styles.resultsHint} role="alert">
        <span>{t('header.searchFailed')}</span>
        <Button size="sm" onClick={search.reload}>
          {t('actions.tryAgain')}
        </Button>
      </div>
    )
  } else if (search.status === 'success' && search.data.length === 0) {
    body = <p className={styles.resultsHint}>{t('header.noResults', { query: query.trim() })}</p>
  } else if (search.status === 'success') {
    const items = search.data.slice(0, MAX_RESULTS)
    body = (
      <>
        <ul className={styles.resultsList} aria-label={t('header.results')}>
          {items.map((item) => {
            const poster = imageUrl(item.posterPath, 'w92')
            const year = getYear(item.date)
            const type = t(item.mediaType === 'movie' ? 'library:movie' : 'library:series')
            return (
              <li key={`${item.mediaType}_${item.id}`}>
                <Link
                  to={`/${item.mediaType === 'movie' ? 'movies' : 'series'}/${item.id}`}
                  className={styles.resultLink}
                  onClick={onPick}
                >
                  <span className={styles.resultPoster} aria-hidden="true">
                    {poster ? (
                      <img src={poster} alt="" loading="lazy" />
                    ) : (
                      <Icon name={item.mediaType === 'movie' ? 'film' : 'tv'} size={16} />
                    )}
                  </span>
                  <span className={styles.resultText}>
                    <strong>{item.title}</strong>
                    <span>{[year, type].filter(Boolean).join(' · ')}</span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
        <Link
          to={{ pathname: catalog, search: `?${createSearchParams({ q: query.trim() })}` }}
          className={styles.resultsAll}
          onClick={onPick}
        >
          {t('header.allResults')}
          <Icon name="arrow-right" size={14} />
        </Link>
      </>
    )
  } else {
    return null
  }

  return (
    <div
      ref={panel}
      className={cx(styles.searchResults, variant === 'popover' ? styles.popover : styles.sheet)}
      // Keeps focus in the field while the pointer is down, so the panel isn't closed by the
      // blur before the click on a card lands (Safari doesn't focus links on click).
      onMouseDown={(event) => event.preventDefault()}
      onKeyDown={handleKeyDown}
    >
      {body}
      <span className="sr-only" role="status">
        {search.status === 'success' ? t('header.resultCount', { count: search.data.length }) : ''}
      </span>
    </div>
  )
}
