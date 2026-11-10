import { useTranslation } from 'react-i18next'
import { imageUrl } from '../../shared/api/tmdb'
import { getYear } from '../../shared/lib/format'
import type { LibraryStatus } from '../../types/library'
import { mediaHref } from '../../utils/media'
import type { PersonWork } from '../../utils/person'
import PosterCard from '../PosterCard/PosterCard'
import StatusMarker from '../StatusMarker/StatusMarker'

const MAX_CREDIT_LINES = 2

/** A poster in a filmography: year, what the person did, and the library status if any. */
export default function WorkCard({
  work,
  status,
  upcoming = false,
}: {
  work: PersonWork
  status?: LibraryStatus
  upcoming?: boolean
}) {
  const { t } = useTranslation('person')
  const lines = work.credits.slice(0, MAX_CREDIT_LINES)
  if (work.mediaType === 'tv' && work.episodeCount) {
    lines.push(t('episodes', { count: work.episodeCount }))
  }
  if (upcoming && !work.date) lines.push(t('tba'))

  return (
    <PosterCard
      title={work.title}
      href={mediaHref(work.mediaType, work.id)}
      posterUrl={imageUrl(work.posterPath, 'w342')}
      year={getYear(work.date)}
      meta={lines.join(' · ')}
      // Announced works have no votes yet: a "0.0" badge would read as a bad score.
      rating={upcoming ? undefined : work.rating}
      badge={status && <StatusMarker status={status} onPoster />}
      placeholderIcon={work.mediaType === 'movie' ? 'film' : 'tv'}
    />
  )
}
