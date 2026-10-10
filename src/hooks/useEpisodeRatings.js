import { useCallback, useEffect, useState } from 'react'
import { endpoints, MAX_APPEND, tmdbGet } from '../api/tmdb.js'

const EMPTY = { key: null, seasons: null, error: null }

function chunk(list, size) {
  const chunks = []
  for (let i = 0; i < list.length; i += size) chunks.push(list.slice(i, i + size))
  return chunks
}

/** Keeps only what the heatmap needs; unaired or unvoted episodes get rating: null. */
function toSeason(raw, today) {
  return {
    number: raw.season_number,
    name: raw.name,
    episodes: raw.episodes.map((e) => ({
      id: e.id,
      season: e.season_number,
      number: e.episode_number,
      name: e.name,
      overview: e.overview,
      airDate: e.air_date,
      runtime: e.runtime,
      still: e.still_path,
      votes: e.vote_count,
      rating: e.vote_count > 0 && e.air_date && e.air_date <= today ? e.vote_average : null,
    })),
  }
}

/**
 * Loads every episode of the given seasons.
 *
 * TMDB allows 20 appended seasons per request, so long shows (The Simpsons: 37 seasons)
 * are split into batches fetched in parallel with Promise.all. All batches share one
 * AbortController: leaving the page or switching series cancels all of them at once.
 *
 * `seasonNumbers` is an array — a new array every render — so the effect depends on
 * a string built from it instead. Arrays compare by reference; strings by value.
 */
export function useEpisodeRatings(seriesId, seasonNumbers) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState(EMPTY)

  const seasonsKey = seasonNumbers.join(',')
  const key = `${seriesId}:${seasonsKey}#${attempt}`

  useEffect(() => {
    if (!seasonsKey) return

    const numbers = seasonsKey.split(',').map(Number)
    const requestKey = `${seriesId}:${seasonsKey}#${attempt}`
    const controller = new AbortController()
    let ignore = false

    const requests = chunk(numbers, MAX_APPEND).map((batch) =>
      tmdbGet(endpoints.seasonsBatch(seriesId, batch), { signal: controller.signal }),
    )

    Promise.all(requests)
      .then((responses) => {
        if (ignore) return
        const today = new Date().toISOString().slice(0, 10)
        const seasons = numbers
          .map((n) => responses.find((r) => r[`season/${n}`])?.[`season/${n}`])
          .filter(Boolean)
          .map((raw) => toSeason(raw, today))
        setResult({ key: requestKey, seasons, error: null })
      })
      .catch((error) => {
        if (!ignore && error.name !== 'AbortError') {
          // One failed batch fails the whole heatmap: a partial grid would be misleading.
          setResult({ key: requestKey, seasons: null, error })
        }
      })

    return () => {
      ignore = true
      controller.abort()
    }
  }, [seriesId, seasonsKey, attempt])

  const reload = useCallback(() => setAttempt((n) => n + 1), [])

  if (!seasonsKey) return { status: 'idle', seasons: null, error: null, reload }
  if (result.key !== key) return { status: 'loading', seasons: null, error: null, reload }
  if (result.error) return { status: 'error', seasons: null, error: result.error, reload }
  return { status: 'success', seasons: result.seasons, error: null, reload }
}
