import { describe, expect, it } from 'vitest'
import {
  AVATAR_COLORS,
  AVATAR_EMOJIS,
  PHOTO_MAX_CHARS,
  avatarFill,
  clampCrop,
  parseAvatar,
  sourceSquare,
} from './avatar'

describe('parseAvatar', () => {
  it('reads an emoji avatar and a photo avatar', () => {
    expect(parseAvatar({ kind: 'emoji', emoji: '🦊', color: 'plan-3' })).toEqual({
      kind: 'emoji',
      emoji: '🦊',
      color: 'plan-3',
    })
    const photo = 'data:image/webp;base64,AAAA'
    expect(parseAvatar({ kind: 'photo', photo })).toEqual({ kind: 'photo', photo })
  })

  it('ignores anything the app would not have written', () => {
    expect(parseAvatar(null)).toBeNull()
    expect(parseAvatar('x')).toBeNull()
    expect(parseAvatar({ kind: 'emoji', emoji: '', color: 'default' })).toBeNull()
    expect(parseAvatar({ kind: 'emoji', emoji: '🦊', color: 'rating-1' })).toBeNull()
    expect(parseAvatar({ kind: 'emoji', emoji: 'x'.repeat(17), color: 'default' })).toBeNull()
    expect(parseAvatar({ kind: 'photo', photo: 'https://example.com/a.png' })).toBeNull()
    expect(parseAvatar({ kind: 'photo', photo: 'data:image/svg+xml;base64,AAAA' })).toBeNull()
    expect(
      parseAvatar({
        kind: 'photo',
        photo: `data:image/jpeg;base64,${'A'.repeat(PHOTO_MAX_CHARS)}`,
      }),
    ).toBeNull()
  })

  it('offers the default tint and the six plan colours, and distinct emojis', () => {
    expect(AVATAR_COLORS).toHaveLength(7)
    expect(new Set(AVATAR_EMOJIS).size).toBe(AVATAR_EMOJIS.length)
  })
})

describe('avatarFill', () => {
  it('uses design tokens only', () => {
    expect(avatarFill('default')).toBe('var(--accent-soft)')
    expect(avatarFill('plan-2')).toContain('var(--plan-2)')
    expect(avatarFill('plan-2')).not.toMatch(/#[0-9a-f]{3,6}/i)
  })
})

describe('crop geometry', () => {
  const view = 240

  it('shows the whole square of a square photo at zoom 1', () => {
    expect(sourceSquare(500, 500, view, { zoom: 1, x: 0, y: 0 })).toEqual({
      sx: 0,
      sy: 0,
      size: 500,
    })
  })

  it('centres a landscape photo and slides along it when dragged', () => {
    const center = sourceSquare(1000, 500, view, { zoom: 1, x: 0, y: 0 })
    expect(center).toMatchObject({ sx: 250, sy: 0, size: 500 })
    // Dragging the photo right by its full slack shows its left edge.
    expect(sourceSquare(1000, 500, view, { zoom: 1, x: 120, y: 0 }).sx).toBeCloseTo(0)
    expect(sourceSquare(1000, 500, view, { zoom: 1, x: -120, y: 0 }).sx).toBeCloseTo(500)
  })

  it('zooming in shows a smaller square of the photo', () => {
    expect(sourceSquare(500, 500, view, { zoom: 2, x: 0, y: 0 })).toMatchObject({
      sx: 125,
      sy: 125,
      size: 250,
    })
  })

  it('never lets an empty corner into the circle', () => {
    expect(clampCrop(1000, 500, view, { zoom: 1, x: 999, y: 999 })).toEqual({
      zoom: 1,
      x: 120,
      y: 0,
    })
    expect(clampCrop(500, 500, view, { zoom: 9, x: 0, y: 0 }).zoom).toBe(4)
    expect(clampCrop(500, 500, view, { zoom: 0.2, x: 0, y: 0 }).zoom).toBe(1)
    const square = sourceSquare(1000, 500, view, { zoom: 3, x: 9999, y: -9999 })
    expect(square.sx).toBeGreaterThanOrEqual(0)
    expect(square.sy).toBeGreaterThanOrEqual(0)
    expect(square.sx + square.size).toBeLessThanOrEqual(1000.001)
    expect(square.sy + square.size).toBeLessThanOrEqual(500.001)
  })
})
