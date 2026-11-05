/** 0 = not rated, 1…5 = the design system's rating scale (rating-1…rating-5 tokens). */
export type RatingStep = 0 | 1 | 2 | 3 | 4 | 5

export const RATING_WORDS: Record<RatingStep, string> = {
  0: 'Not rated',
  1: 'Skip',
  2: 'Weak',
  3: 'Fine',
  4: 'Good',
  5: 'Great',
}

/** <5 Skip · 5–6.4 Weak · 6.5–7.4 Fine · 7.5–8.4 Good · 8.5+ Great. TMDB uses 0 for "no votes". */
export function ratingStep(value: number | null | undefined): RatingStep {
  if (!value) return 0
  if (value < 5) return 1
  if (value < 6.5) return 2
  if (value < 7.5) return 3
  if (value < 8.5) return 4
  return 5
}
