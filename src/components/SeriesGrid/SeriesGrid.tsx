import { imageUrl } from '../../api/tmdb'
import type { SeriesListItem } from '../../types/tmdb'
import { getYear } from '../../utils/format'
import PosterCard from '../PosterCard/PosterCard'
import PosterGrid from '../PosterCard/PosterGrid'

interface SeriesGridProps {
  items: SeriesListItem[]
  genresById: Map<number, string>
  label?: string
}

export default function SeriesGrid({ items, genresById, label }: SeriesGridProps) {
  return (
    <PosterGrid label={label}>
      {items.map((series) => (
        // TMDB id is unique and stable across pages and re-fetches — a safe key.
        <li key={series.id}>
          <PosterCard
            title={series.name}
            href={`/series/${series.id}`}
            posterUrl={imageUrl(series.poster_path, 'w342')}
            year={getYear(series.first_air_date)}
            meta={series.genre_ids
              .map((id) => genresById.get(id))
              .filter(Boolean)
              .slice(0, 2)
              .join(', ')}
            rating={series.vote_average}
          />
        </li>
      ))}
    </PosterGrid>
  )
}
