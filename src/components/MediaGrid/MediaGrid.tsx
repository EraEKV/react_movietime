import type { ReactNode } from 'react'
import { imageUrl } from '../../shared/api/tmdb'
import type { MediaSummary } from '../../types/media'
import { getYear } from '../../utils/format'
import { mediaHref, mediaKey } from '../../utils/media'
import PosterCard from '../PosterCard/PosterCard'
import PosterGrid from '../PosterCard/PosterGrid'
import PosterRow from '../PosterRow/PosterRow'

interface MediaGridProps {
  items: MediaSummary[]
  genresById: Map<number, string>
  label: string
  /** "grid" wraps (catalogs); "row" scrolls sideways (recommendations under a title). */
  layout?: 'grid' | 'row'
  /** Hover actions per card (e.g. "Add to list"); the page owns what they open. */
  renderActions?: (item: MediaSummary) => ReactNode
}

/** Posters for movies and series alike: catalogs and recommendations. */
export default function MediaGrid({
  items,
  genresById,
  label,
  layout = 'grid',
  renderActions,
}: MediaGridProps) {
  const List = layout === 'row' ? PosterRow : PosterGrid
  return (
    <List label={label}>
      {items.map((item) => (
        // The media key is unique across movies and series and stable between re-fetches.
        <li key={mediaKey(item.mediaType, item.id)}>
          <PosterCard
            title={item.title}
            href={mediaHref(item.mediaType, item.id)}
            posterUrl={imageUrl(item.posterPath, 'w342')}
            year={getYear(item.date)}
            meta={item.genreIds
              .map((id) => genresById.get(id))
              .filter(Boolean)
              .slice(0, 2)
              .join(', ')}
            rating={item.rating}
            placeholderIcon={item.mediaType === 'movie' ? 'film' : 'tv'}
            actions={renderActions?.(item)}
          />
        </li>
      ))}
    </List>
  )
}
