import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { LibraryStatus } from '../../types/library'
import type { MediaKey } from '../../types/media'
import {
  filterWorks,
  seenProgress,
  sortUpcoming,
  sortWorks,
  splitReleased,
  type FilmographyFilters,
  type MediaFilter,
  type PersonRole,
  type PersonWork,
  type RoleFilter,
  type WorkSort,
} from '../../utils/person'
import Button from '../../shared/ui/Button/Button'
import EmptyState from '../../shared/ui/EmptyState/EmptyState'
import ProgressBar from '../../shared/ui/ProgressBar/ProgressBar'
import Section from '../../shared/ui/Section/Section'
import SegmentedControl, {
  type SegmentOption,
} from '../../shared/ui/SegmentedControl/SegmentedControl'
import PosterGrid from '../PosterCard/PosterGrid'
import WorkCard from './WorkCard'
import styles from './PersonDetails.module.css'

interface FilmographyProps {
  name: string
  works: PersonWork[]
  today: string
  statuses: ReadonlyMap<MediaKey, LibraryStatus>
}

const ROLES: Exclude<RoleFilter, 'all'>[] = ['actor', 'director', 'writer']

const hasRole = (works: PersonWork[], role: PersonRole) =>
  works.some((work) => work.roles.includes(role))

/**
 * Everything the person worked on: filters by role and type, sort by year or popularity,
 * library marks on the cards and a "you've seen N of M" bar. Announced works are listed
 * in their own section after the released ones.
 */
export default function Filmography({ name, works, today, statuses }: FilmographyProps) {
  const { t } = useTranslation('person')
  const [filters, setFilters] = useState<FilmographyFilters>({ role: 'all', media: 'all' })
  const [sort, setSort] = useState<WorkSort>('year')

  // Offer only what exists: a writer-only filter on an actor with no writing credits is noise.
  const roleOptions = useMemo<SegmentOption<RoleFilter>[]>(
    () => [
      { value: 'all', label: t('filters.all') },
      ...ROLES.filter((role) => hasRole(works, role)).map((role) => ({
        value: role,
        label: t(`filters.${role}`),
      })),
    ],
    [works, t],
  )
  const mediaOptions = useMemo<SegmentOption<MediaFilter>[]>(() => {
    const options: SegmentOption<MediaFilter>[] = [{ value: 'all', label: t('filters.all') }]
    if (works.some((work) => work.mediaType === 'movie')) {
      options.push({ value: 'movie', label: t('filters.movies') })
    }
    if (works.some((work) => work.mediaType === 'tv')) {
      options.push({ value: 'tv', label: t('filters.series') })
    }
    return options
  }, [works, t])

  const sortOptions: SegmentOption<WorkSort>[] = [
    { value: 'year', label: t('filters.year') },
    { value: 'popularity', label: t('filters.popularity') },
  ]

  const { released, upcoming } = useMemo(() => {
    const parts = splitReleased(filterWorks(works, filters), today)
    return { released: sortWorks(parts.released, sort), upcoming: sortUpcoming(parts.upcoming) }
  }, [works, filters, sort, today])

  const progress = seenProgress(released, statuses)
  const shown = released.length + upcoming.length

  if (works.length === 0) {
    return (
      <Section title={t('filmography')}>
        <EmptyState
          icon="film"
          title={t('empty.title')}
          body={t('empty.body', { name })}
          headingLevel="h3"
        />
      </Section>
    )
  }

  return (
    <Section title={t('filmography')}>
      <div className={styles.list}>
        <div className={styles.controls}>
          {roleOptions.length > 1 && (
            <div className={styles.control}>
              <SegmentedControl
                label={t('filters.role')}
                options={roleOptions}
                value={filters.role}
                onChange={(role) => setFilters((current) => ({ ...current, role }))}
              />
            </div>
          )}
          {mediaOptions.length > 2 && (
            <div className={styles.control}>
              <SegmentedControl
                label={t('filters.media')}
                options={mediaOptions}
                value={filters.media}
                onChange={(media) => setFilters((current) => ({ ...current, media }))}
              />
            </div>
          )}
          <div className={styles.control}>
            <SegmentedControl
              label={t('filters.sort')}
              options={sortOptions}
              value={sort}
              onChange={setSort}
            />
          </div>
        </div>

        {progress.total > 0 && (
          <div className={styles.progress}>
            <div className={styles.progressText}>
              <strong>{t('progress.seen', { seen: progress.seen, total: progress.total })}</strong>
              {progress.planned > 0 && (
                <span className={styles.muted}>
                  {t('progress.planned', { count: progress.planned })}
                </span>
              )}
            </div>
            <ProgressBar value={progress.seen / progress.total} label={t('progress.label')} />
          </div>
        )}

        {shown === 0 ? (
          <EmptyState
            icon="search"
            title={t('noMatch.title')}
            body={t('noMatch.body')}
            headingLevel="h3"
            actions={
              <Button onClick={() => setFilters({ role: 'all', media: 'all' })}>
                {t('filters.clear')}
              </Button>
            }
          />
        ) : (
          <>
            {released.length > 0 && (
              <PosterGrid label={t('listLabel', { name })}>
                {released.map((work) => (
                  <li key={work.key}>
                    <WorkCard work={work} status={statuses.get(work.key)} />
                  </li>
                ))}
              </PosterGrid>
            )}
            {upcoming.length > 0 && (
              <Section title={t('upcoming')}>
                <PosterGrid label={t('upcoming')}>
                  {upcoming.map((work) => (
                    <li key={work.key}>
                      <WorkCard work={work} status={statuses.get(work.key)} upcoming />
                    </li>
                  ))}
                </PosterGrid>
              </Section>
            )}
          </>
        )}

        <span className="sr-only" role="status">
          {t('shown', { count: shown })}
        </span>
      </div>
    </Section>
  )
}
