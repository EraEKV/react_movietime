import { imageUrl } from '../../api/tmdb'
import { useWatchlist } from '../../hooks/useWatchlist'
import { getYear } from '../../utils/format'
import PosterCard from '../PosterCard/PosterCard'
import PosterRow from '../PosterRow/PosterRow'
import Section from '../Section/Section'
import SectionLink from '../SectionHeader/SectionLink'

/** Series marked "Watching" in the library. Nothing to continue → the section is skipped. */
export default function ContinueWatching() {
  const { entries } = useWatchlist()
  const watching = entries.filter((e) => e.status === 'watching')
  if (watching.length === 0) return null

  return (
    <Section title="Continue watching" aside={<SectionLink to="/library">Library</SectionLink>}>
      <PosterRow label="Continue watching">
        {watching.map((entry) => (
          <li key={entry.id}>
            <PosterCard
              title={entry.name}
              href={`/series/${entry.seriesId}`}
              posterUrl={imageUrl(entry.posterPath, 'w342')}
              year={getYear(entry.firstAirDate)}
              meta="Series"
              rating={entry.tmdbRating}
            />
          </li>
        ))}
      </PosterRow>
    </Section>
  )
}
