import { useTranslation } from 'react-i18next'
import { imageUrl } from '../../shared/api/tmdb'
import { getYear } from '../../shared/lib/format'
import type { LibraryStatus } from '../../types/library'
import type { CollectionFilm } from '../../utils/collection'
import { mediaHref } from '../../utils/media'
import PosterCard from '../PosterCard/PosterCard'
import StatusMarker from '../StatusMarker/StatusMarker'

/** A film of a collection: year, rating and the library status if you have it. */
export default function FilmCard({
  film,
  status,
  upcoming = false,
}: {
  film: CollectionFilm
  status?: LibraryStatus
  upcoming?: boolean
}) {
  const { t } = useTranslation('collection')
  return (
    <PosterCard
      title={film.title}
      href={mediaHref('movie', film.id)}
      posterUrl={imageUrl(film.posterPath, 'w342')}
      year={getYear(film.date)}
      meta={upcoming && !film.date ? t('tba') : undefined}
      // An announced film has no votes: a "0.0" badge would read as a bad score.
      rating={upcoming ? undefined : film.rating}
      badge={status && <StatusMarker status={status} onPoster />}
      placeholderIcon="film"
    />
  )
}
