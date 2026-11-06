import { useTranslation } from 'react-i18next'
import { imageUrl } from '../../api/tmdb'
import { useLibrary } from '../../hooks/useLibrary'
import { episodeCode } from '../../utils/format'
import { progressRatio } from '../../utils/library'
import { mediaHref } from '../../utils/media'
import PosterCard from '../PosterCard/PosterCard'
import PosterRow from '../PosterRow/PosterRow'
import Section from '../Section/Section'
import SectionLink from '../SectionHeader/SectionLink'

/** Titles marked "Watching" in the library. Nothing to continue → the section is skipped. */
export default function ContinueWatching() {
  const { t } = useTranslation('home')
  const { entries } = useLibrary()
  const watching = entries.filter((e) => e.status === 'watching')
  if (watching.length === 0) return null

  return (
    <Section
      title={t('continue.title')}
      aside={<SectionLink to="/library">{t('continue.library')}</SectionLink>}
    >
      <PosterRow label={t('continue.title')}>
        {watching.map((entry) => {
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
                    ? [
                        episodeCode(entry.progress.season, entry.progress.episode),
                        progress !== null && `${Math.round(progress * 100)}%`,
                      ]
                        .filter(Boolean)
                        .join(' · ')
                    : entry.mediaType === 'movie'
                      ? t('media.movie')
                      : t('media.series')
                }
                rating={entry.tmdbRating}
                progress={progress ?? undefined}
                placeholderIcon={entry.mediaType === 'movie' ? 'film' : 'tv'}
              />
            </li>
          )
        })}
      </PosterRow>
    </Section>
  )
}
