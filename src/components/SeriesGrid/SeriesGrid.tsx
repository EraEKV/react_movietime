import type { SeriesListItem } from '../../types/tmdb'
import SeriesCard from '../SeriesCard/SeriesCard'
import styles from './SeriesGrid.module.css'

interface SeriesGridProps {
  items: SeriesListItem[]
  genresById: Map<number, string>
}

export default function SeriesGrid({ items, genresById }: SeriesGridProps) {
  return (
    <ul className={styles.grid}>
      {items.map((series) => (
        // TMDB id is unique and stable across pages and re-fetches — a safe key.
        <li key={series.id}>
          <SeriesCard
            series={series}
            genreNames={series.genre_ids
              .map((id) => genresById.get(id))
              .filter((name): name is string => Boolean(name))}
          />
        </li>
      ))}
    </ul>
  )
}
