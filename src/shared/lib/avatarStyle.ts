import type { AvatarColor } from '../types/avatar'

/** The fill of an emoji avatar: a tint of the colour on the surface, readable in both themes. */
export const avatarFill = (color: AvatarColor) =>
  color === 'default'
    ? 'var(--accent-soft)'
    : `color-mix(in srgb, var(--${color}) 30%, var(--surface))`

/** The ring around a coloured avatar (none for the default tint). */
export const avatarRing = (color: AvatarColor) =>
  color === 'default' ? 'transparent' : `var(--${color})`
