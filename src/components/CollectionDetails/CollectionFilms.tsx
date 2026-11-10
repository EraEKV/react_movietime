import { useTranslation } from 'react-i18next'
import type { LibraryStatus } from '../../types/library'
import type { MediaKey } from '../../types/media'
import type { CollectionFilm } from '../../utils/collection'
import EmptyState from '../../shared/ui/EmptyState/EmptyState'
import Section from '../../shared/ui/Section/Section'
import PosterGrid from '../PosterCard/PosterGrid'
import FilmCard from './FilmCard'

interface CollectionFilmsProps {
  name: string
  released: CollectionFilm[]
  upcoming: CollectionFilm[]
  statuses: ReadonlyMap<MediaKey, LibraryStatus>
}

/** The films in release order; announced ones (no date or a future date) after them. */
export default function CollectionFilms({
  name,
  released,
  upcoming,
  statuses,
}: CollectionFilmsProps) {
  const { t } = useTranslation('collection')

  if (released.length + upcoming.length === 0) {
    return (
      <Section title={t('films')}>
        <EmptyState
          icon="film"
          title={t('empty.title')}
          body={t('empty.body', { name })}
          headingLevel="h3"
        />
      </Section>
    )
  }

  return (
    <>
      {released.length > 0 && (
        <Section title={t('films')}>
          <PosterGrid label={t('filmsLabel', { name })}>
            {released.map((film) => (
              <li key={film.key}>
                <FilmCard film={film} status={statuses.get(film.key)} />
              </li>
            ))}
          </PosterGrid>
        </Section>
      )}
      {upcoming.length > 0 && (
        <Section title={t('upcoming')}>
          <PosterGrid label={t('upcoming')}>
            {upcoming.map((film) => (
              <li key={film.key}>
                <FilmCard film={film} status={statuses.get(film.key)} upcoming />
              </li>
            ))}
          </PosterGrid>
        </Section>
      )}
    </>
  )
}
