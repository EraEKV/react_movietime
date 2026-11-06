import { Link } from 'react-router'
import { imageUrl } from '../../api/tmdb'
import type { ListItem } from '../../types/list'
import { mediaHref } from '../../utils/media'
import { buttonClass } from '../Button/variants'
import Icon from '../Icon/Icon'
import IconButton from '../IconButton/IconButton'
import Menu from '../Menu/Menu'
import PosterCard from '../PosterCard/PosterCard'
import PosterGrid from '../PosterCard/PosterGrid'
import RatingBadge from '../RatingBadge/RatingBadge'
import styles from './ListItems.module.css'

interface ListItemsProps {
  items: ListItem[]
  view: 'grid' | 'rows'
  /** Owner and editors get note and remove actions; viewers only look. */
  editable: boolean
  onEditNote: (item: ListItem) => void
  onRemove: (item: ListItem) => void
}

const typeLabel = (item: ListItem) => (item.mediaType === 'movie' ? 'Movie' : 'Series')

/** Items of a list as a poster grid or as rows, with "Added by" and the note. */
export default function ListItems({ items, view, editable, onEditNote, onRemove }: ListItemsProps) {
  if (view === 'grid') {
    return (
      <PosterGrid label="Titles in this list">
        {items.map((item) => (
          <li key={item.key} className={styles.gridItem}>
            <PosterCard
              title={item.title}
              href={mediaHref(item.mediaType, item.tmdbId)}
              posterUrl={imageUrl(item.posterPath, 'w342')}
              year={item.year}
              meta={typeLabel(item)}
              rating={item.tmdbRating}
              placeholderIcon={item.mediaType === 'movie' ? 'film' : 'tv'}
            />
            <div className={styles.gridFooter}>
              <div className={styles.gridText}>
                {item.addedBy.name && (
                  <span className={styles.by}>Added by {item.addedBy.name}</span>
                )}
                {item.note && <p className={styles.note}>“{item.note}”</p>}
              </div>
              {/* Always visible (not on hover), so it works on touch screens too. */}
              {editable && (
                <Menu
                  label={`Actions for ${item.title}`}
                  align="right"
                  triggerClassName={buttonClass('ghost', 'sm', { iconOnly: true })}
                  trigger={<Icon name="more" size={18} />}
                  items={[
                    {
                      label: item.note ? 'Edit note' : 'Add note',
                      icon: 'edit',
                      onSelect: () => onEditNote(item),
                    },
                    {
                      label: 'Remove from list',
                      icon: 'trash',
                      danger: true,
                      onSelect: () => onRemove(item),
                    },
                  ]}
                />
              )}
            </div>
          </li>
        ))}
      </PosterGrid>
    )
  }

  return (
    <ul className={styles.rows} aria-label="Titles in this list">
      {items.map((item) => {
        const href = mediaHref(item.mediaType, item.tmdbId)
        const poster = imageUrl(item.posterPath, 'w185')
        return (
          <li key={item.key} className={styles.row}>
            {/* Decorative duplicate of the title link: hidden from keyboard and screen readers. */}
            <Link to={href} className={styles.poster} tabIndex={-1} aria-hidden="true">
              {poster ? (
                <img src={poster} alt="" loading="lazy" />
              ) : (
                <Icon name={item.mediaType === 'movie' ? 'film' : 'tv'} size={20} />
              )}
            </Link>
            <div className={styles.rowBody}>
              <h3 className={styles.title}>
                <Link to={href}>{item.title}</Link>
              </h3>
              <span className={styles.by}>
                {[typeLabel(item), item.year, item.addedBy.name && `Added by ${item.addedBy.name}`]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
              {item.note && <p className={styles.note}>“{item.note}”</p>}
            </div>
            <span className={styles.rating}>
              <RatingBadge value={item.tmdbRating} />
            </span>
            {editable && (
              <div className={styles.rowActions}>
                <IconButton
                  icon="edit"
                  label={`${item.note ? 'Edit' : 'Add'} note for ${item.title}`}
                  onClick={() => onEditNote(item)}
                />
                <IconButton
                  icon="trash"
                  label={`Remove ${item.title}`}
                  onClick={() => onRemove(item)}
                />
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
