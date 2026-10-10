import { endpoints } from '../../api/tmdb.js'
import { useFetch } from '../../hooks/useFetch.js'
import { useGenres } from '../../hooks/useGenres.js'
import { pickTrailer, sortSeasons } from '../../utils/series.js'
import BackButton from '../BackButton/BackButton.jsx'
import Button from '../Button/Button.jsx'
import CastList from '../CastList/CastList.jsx'
import SeasonList from '../SeasonList/SeasonList.jsx'
import Section from '../Section/Section.jsx'
import SeriesGrid from '../SeriesGrid/SeriesGrid.jsx'
import SeriesHero from '../SeriesHero/SeriesHero.jsx'
import StatusMessage from '../StatusMessage/StatusMessage.jsx'
import Trailer from '../Trailer/Trailer.jsx'
import DetailsSkeleton from './DetailsSkeleton.jsx'

const MAX_CAST = 12
const MAX_RECOMMENDATIONS = 10

export default function SeriesDetails({ seriesId }) {
  // One request: details + credits + videos + recommendations via append_to_response.
  const { status, data: series, error, reload } = useFetch(endpoints.seriesDetails(seriesId))
  const { genresById } = useGenres()

  if (status === 'loading') return <DetailsSkeleton />

  if (status === 'error') {
    const notFound = error.status === 404
    return (
      <>
        <BackButton />
        <StatusMessage
          tone="error"
          title={notFound ? 'Series not found' : "Couldn't load this series"}
          action={!notFound && <Button onClick={reload}>Try again</Button>}
        >
          {notFound ? 'It may have been removed from TMDB, or the link is wrong.' : error.message}
        </StatusMessage>
      </>
    )
  }

  const cast = series.credits.cast.slice(0, MAX_CAST)
  const trailer = pickTrailer(series.videos.results)
  const seasons = sortSeasons(series.seasons)
  const recommendations = series.recommendations.results.slice(0, MAX_RECOMMENDATIONS)

  return (
    <article>
      {/* React 19 hoists <title> into <head> — no document.title side effect needed. */}
      <title>{`${series.name} · Movietime`}</title>

      <BackButton />
      <SeriesHero series={series} />

      {seasons.length > 0 && (
        <Section title="Seasons">
          <SeasonList seasons={seasons} />
        </Section>
      )}

      {trailer && (
        <Section title="Trailer">
          <Trailer video={trailer} title={series.name} />
        </Section>
      )}

      {cast.length > 0 && (
        <Section title="Cast">
          <CastList cast={cast} />
        </Section>
      )}

      {recommendations.length > 0 && (
        <Section title="You might also like">
          <SeriesGrid items={recommendations} genresById={genresById} />
        </Section>
      )}
    </article>
  )
}
