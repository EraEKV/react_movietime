export function getYear(date) {
  return date ? date.slice(0, 4) : null
}

export function formatRating(vote) {
  return vote ? vote.toFixed(1) : '—'
}

export function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(value)
}

/** Maps a 0–10 score to a tone used by badges and the episode heatmap. */
export function ratingTone(vote) {
  if (!vote) return 'none'
  if (vote >= 8) return 'great'
  if (vote >= 7) return 'good'
  if (vote >= 5.5) return 'ok'
  return 'bad'
}

/** Parses a positive integer from a URL param, falling back when invalid. */
export function parsePage(value, max) {
  const page = Number.parseInt(value, 10)
  if (!Number.isFinite(page) || page < 1) return 1
  return Math.min(page, max)
}
