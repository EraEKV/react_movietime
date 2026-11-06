import { useTranslation } from 'react-i18next'
import { imageUrl } from '../../api/tmdb'
import type { LibraryEntry } from '../../types/library'
import { episodeCode } from '../../utils/format'
import { progressRatio } from '../../utils/library'
import { mediaHref } from '../../utils/media'
import PosterCard from '../PosterCard/PosterCard'
import PosterGrid from '../PosterCard/PosterGrid'
import StatusMarker from '../StatusMarker/StatusMarker'

/** Poster view of the library: status as a badge, series progress as a bar. */
export default function LibraryGrid({ entries }: { entries: LibraryEntry[] }) {
  const { t } = useTranslation('library')
  return (
    <PosterGrid label={t('title')}>
      {entries.map((entry) => {
        const progress = progressRatio(entry)
        return (
          <li key={entry.key}>
            <PosterCard
              title={entry.title}
              href={mediaHref(entry.mediaType, entry.tmdbId)}
              posterUrl={imageUrl(entry.posterPath, 'w342')}
              year={entry.year}
              meta={
                entry.progress
                  ? episodeCode(entry.progress.season, entry.progress.episode)
                  : entry.score
                    ? t('yourScore', { score: entry.score })
                    : undefined
              }
              rating={entry.tmdbRating}
              badge={<StatusMarker status={entry.status} onPoster />}
              progress={progress !== null && progress < 1 ? progress : undefined}
              placeholderIcon={entry.mediaType === 'movie' ? 'film' : 'tv'}
            />
          </li>
        )
      })}
    </PosterGrid>
  )
}
