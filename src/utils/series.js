/** Best YouTube trailer: official trailer → any trailer → teaser. */
export function pickTrailer(videos = []) {
  const youtube = videos.filter((v) => v.site === 'YouTube')
  return (
    youtube.find((v) => v.type === 'Trailer' && v.official) ??
    youtube.find((v) => v.type === 'Trailer') ??
    youtube.find((v) => v.type === 'Teaser') ??
    null
  )
}

/** Regular seasons first; "Specials" (season 0) last, and empty announced seasons dropped. */
export function sortSeasons(seasons = []) {
  return seasons
    .filter((s) => s.episode_count > 0)
    .toSorted((a, b) => (a.season_number || Infinity) - (b.season_number || Infinity))
}
