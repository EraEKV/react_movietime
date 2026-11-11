// Recharts draws SVG, and SVG attributes accept CSS variables, so the charts follow the
// theme (dark/light) without any JavaScript colour logic.
export const AXIS_TICK = { fill: 'var(--text-muted)', fontSize: 12 }
export const GRID_STROKE = 'var(--border)'
export const CURSOR = { fill: 'var(--surface-hover)', opacity: 0.6 }

/** Charts that draw themselves in are skipped for people who ask for less motion. */
export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
