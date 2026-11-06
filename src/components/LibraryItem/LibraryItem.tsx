import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { imageUrl } from '../../api/tmdb'
import type { LibraryEntry, LibraryStatus } from '../../types/library'
import { cx } from '../../utils/cx'
import { episodeCode } from '../../utils/format'
import { LIBRARY_STATUSES, progressRatio } from '../../utils/library'
import { mediaHref } from '../../utils/media'
import { buttonClass } from '../Button/variants'
import Icon from '../Icon/Icon'
import IconButton from '../IconButton/IconButton'
import Menu from '../Menu/Menu'
import ProgressBar from '../ProgressBar/ProgressBar'
import SelectField from '../SelectField/SelectField'
import StatusMarker from '../StatusMarker/StatusMarker'
import { STATUS_ICON } from '../StatusMarker/statusIcons'
import styles from './LibraryItem.module.css'

interface LibraryItemProps {
  entry: LibraryEntry
  onStatusChange: (entry: LibraryEntry, status: LibraryStatus) => void
  onRemove: (entry: LibraryEntry) => void
}

/** One library row: poster, title, status, score, series progress, note and actions. */
export default function LibraryItem({ entry, onStatusChange, onRemove }: LibraryItemProps) {
  const { t } = useTranslation('library')
  const href = mediaHref(entry.mediaType, entry.tmdbId)
  const poster = imageUrl(entry.posterPath, 'w185')
  const progress = progressRatio(entry)
  const editHref = `/library/${entry.key}/edit`
  // Series only: a movie is one night, a plan is for watching episodes over time.
  const planHref = entry.mediaType === 'tv' ? `/planner/new?series=${entry.tmdbId}` : null

  return (
    <article className={cx(styles.item, entry.status === 'dropped' && styles.dropped)}>
      {/* Decorative duplicate of the title link: hidden from keyboard and screen readers. */}
      <Link to={href} className={styles.poster} tabIndex={-1} aria-hidden="true">
        {poster ? (
          <img src={poster} alt="" loading="lazy" />
        ) : (
          <Icon name={entry.mediaType === 'movie' ? 'film' : 'tv'} size={24} />
        )}
      </Link>

      <div className={styles.body}>
        <div className={styles.heading}>
          <h3 className={styles.title}>
            <Link to={href}>{entry.title}</Link>
          </h3>
          <span className={styles.meta}>
            {[t(entry.mediaType === 'movie' ? 'movie' : 'series'), entry.year]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </div>

        <div className={styles.facts}>
          <StatusMarker status={entry.status} />
          {entry.score ? (
            <span className={styles.score}>
              Your score <strong>{entry.score}/10</strong>
            </span>
          ) : (
            <span className={styles.unscored}>Not scored</span>
          )}
        </div>

        {entry.progress && (
          <div className={styles.progress}>
            <ProgressBar
              value={progress ?? 0}
              label={t('item.progress', { title: entry.title })}
              caption={[
                episodeCode(entry.progress.season, entry.progress.episode),
                progress !== null && `${Math.round(progress * 100)}%`,
              ]
                .filter(Boolean)
                .join(' · ')}
            />
          </div>
        )}

        {entry.notes && <p className={styles.notes}>“{entry.notes}”</p>}
      </div>

      {/* Wide screens: the status select and icon buttons are visible right away. */}
      <div className={styles.actions}>
        <SelectField
          label={t('item.status', { title: entry.title })}
          hideLabel
          className={styles.status}
          value={entry.status}
          options={LIBRARY_STATUSES}
          onChange={(status) => onStatusChange(entry, status)}
        />
        <Link
          to={editHref}
          className={buttonClass('ghost', 'md', { iconOnly: true })}
          aria-label={t('item.edit', { title: entry.title })}
          title={t('item.edit', { title: entry.title })}
        >
          <Icon name="edit" size={20} />
        </Link>
        {planHref && (
          <Link
            to={planHref}
            className={buttonClass('ghost', 'md', { iconOnly: true })}
            aria-label={t('item.plan', { title: entry.title })}
            title={t('item.plan', { title: entry.title })}
          >
            <Icon name="calendar" size={20} />
          </Link>
        )}
        <IconButton
          icon="trash"
          label={t('item.remove', { title: entry.title })}
          onClick={() => onRemove(entry)}
        />
      </div>

      {/* Phones: the same actions in one menu, so the row stays readable. */}
      <div className={styles.menu}>
        <Menu
          label={t('item.actions', { title: entry.title })}
          align="right"
          triggerClassName={buttonClass('ghost', 'md', { iconOnly: true })}
          trigger={<Icon name="more" size={20} />}
          items={[
            ...LIBRARY_STATUSES.map((option) => ({
              label: option.label,
              icon: STATUS_ICON[option.value],
              checked: option.value === entry.status,
              onSelect: () => onStatusChange(entry, option.value),
            })),
            { kind: 'divider' },
            { label: t('item.editShort'), icon: 'edit', to: editHref },
            ...(planHref
              ? [{ label: t('item.planShort'), icon: 'calendar' as const, to: planHref }]
              : []),
            {
              label: t('item.removeShort'),
              icon: 'trash',
              danger: true,
              onSelect: () => onRemove(entry),
            },
          ]}
        />
      </div>
    </article>
  )
}
