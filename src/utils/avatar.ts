import type { AvatarColor, UserAvatar } from '../shared/types/avatar'

export { avatarFill, avatarRing } from '../shared/lib/avatarStyle'

// The avatar a user picks: an emoji on a colour, or a cropped photo. Limits are the same as
// in firestore.rules (validAvatar), which is the source of truth.

/** `default` is the plain accent tint; the others are the plan colours of the design system. */
export const AVATAR_COLORS: readonly AvatarColor[] = [
  'default',
  'plan-1',
  'plan-2',
  'plan-3',
  'plan-4',
  'plan-5',
  'plan-6',
]

/** A short, film-flavoured set: easy to scan, every one of them renders on every platform. */
export const AVATAR_EMOJIS: readonly string[] = [
  '🎬',
  '🍿',
  '🎞️',
  '📽️',
  '🎭',
  '🎥',
  '🦊',
  '🐼',
  '🐙',
  '🦄',
  '🐱',
  '🐶',
  '🦉',
  '🐸',
  '🚀',
  '🌙',
  '⭐',
  '🔥',
  '👾',
  '🤖',
  '🧙',
  '🦖',
  '🍕',
  '🎧',
]

/** The stored photo is a square of this many pixels. */
export const PHOTO_SIZE = 256
/** At most this many characters of data URL (≈ 30 KB of image): the rules refuse more. */
export const PHOTO_MAX_CHARS = 40_000
/** An emoji is at most this many UTF-16 units (a family emoji is longer than a face). */
export const EMOJI_MAX_LENGTH = 16

export const PHOTO_URL = /^data:image\/(webp|jpeg);base64,[A-Za-z0-9+/=]+$/

const isColor = (value: unknown): value is AvatarColor =>
  AVATAR_COLORS.includes(value as AvatarColor)

/** Firestore data → avatar; anything the app wouldn't have written is ignored. */
export function parseAvatar(value: unknown): UserAvatar | null {
  if (typeof value !== 'object' || value === null) return null
  const a = value as Record<string, unknown>
  if (
    a.kind === 'emoji' &&
    typeof a.emoji === 'string' &&
    a.emoji.length >= 1 &&
    a.emoji.length <= EMOJI_MAX_LENGTH &&
    isColor(a.color)
  ) {
    return { kind: 'emoji', emoji: a.emoji, color: a.color }
  }
  if (
    a.kind === 'photo' &&
    typeof a.photo === 'string' &&
    a.photo.length <= PHOTO_MAX_CHARS &&
    PHOTO_URL.test(a.photo)
  ) {
    return { kind: 'photo', photo: a.photo }
  }
  return null
}

/* ---------- Crop geometry ---------- */

/** Where the photo sits inside the square viewport: zoom ≥ 1 and the offset of its centre. */
export interface Crop {
  zoom: number
  x: number
  y: number
}

export const MAX_ZOOM = 4

/** Pixels per image pixel at zoom 1: the shorter side exactly fills the viewport. */
export const coverScale = (width: number, height: number, view: number) =>
  view / Math.min(width, height)

const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value))

/** Keeps the photo covering the viewport: no empty corner can be dragged into the circle. */
export function clampCrop(width: number, height: number, view: number, crop: Crop): Crop {
  const zoom = Math.max(1, Math.min(MAX_ZOOM, crop.zoom))
  const scale = coverScale(width, height, view) * zoom
  return {
    zoom,
    x: clamp(crop.x, Math.max(0, (width * scale - view) / 2)),
    y: clamp(crop.y, Math.max(0, (height * scale - view) / 2)),
  }
}

/** The square of the original photo that the viewport shows, in photo pixels. */
export function sourceSquare(width: number, height: number, view: number, crop: Crop) {
  const { zoom, x, y } = clampCrop(width, height, view, crop)
  const scale = coverScale(width, height, view) * zoom
  return {
    sx: (width * scale - view) / 2 / scale - x / scale,
    sy: (height * scale - view) / 2 / scale - y / scale,
    size: view / scale,
  }
}
