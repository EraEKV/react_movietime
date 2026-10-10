import SeriesCard from '../SeriesCard/SeriesCard.jsx'
import styles from './SeriesGrid.module.css'

export default function SeriesGrid({ items, genresById }) {
  return (
    <ul className={styles.grid}>
      {items.map((series) => (
        // TMDB id is unique and stable across pages and re-fetches — a safe key.
        <li key={series.id}>
          <SeriesCard
            series={series}
            genreNames={series.genre_ids.map((id) => genresById.get(id)).filter(Boolean)}
          />
        </li>
      ))}
    </ul>
  )
}
