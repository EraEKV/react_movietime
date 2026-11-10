import { PHOTO_MAX_CHARS, PHOTO_SIZE, sourceSquare, type Crop } from './avatar'

// The browser half of the photo avatar: decoding a chosen file and encoding the cropped
// square. The geometry lives in utils/avatar.ts, where it can be tested without a canvas.

/** Files bigger than this are not even decoded (a phone photo is a few MB). */
export const MAX_FILE_BYTES = 15 * 1024 * 1024

export interface LoadedPhoto {
  img: HTMLImageElement
  /** Object URL for showing it; release it with URL.revokeObjectURL when done. */
  url: string
}

/** Decodes a chosen file; rejects when it isn't an image the browser can read. */
export function loadPhoto(file: File): Promise<LoadedPhoto> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/') || file.size > MAX_FILE_BYTES) {
      reject(new Error(file.size > MAX_FILE_BYTES ? 'too-big' : 'not-image'))
      return
    }
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => resolve({ img, url })
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('not-image'))
    }
    img.src = url
  })
}

/**
 * The square the viewport shows, as a 256 × 256 WebP (JPEG where the browser can't make
 * WebP) data URL, with the quality lowered until it fits the limit; null when even the
 * lowest quality is too large.
 */
export function renderPhoto(img: HTMLImageElement, view: number, crop: Crop): string | null {
  const canvas = document.createElement('canvas')
  canvas.width = PHOTO_SIZE
  canvas.height = PHOTO_SIZE
  const context = canvas.getContext('2d')
  if (!context) return null
  // Transparent PNGs would turn black in a JPEG.
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, PHOTO_SIZE, PHOTO_SIZE)
  context.imageSmoothingQuality = 'high'
  const { sx, sy, size } = sourceSquare(img.naturalWidth, img.naturalHeight, view, crop)
  context.drawImage(img, sx, sy, size, size, 0, 0, PHOTO_SIZE, PHOTO_SIZE)

  for (const type of ['image/webp', 'image/jpeg']) {
    for (const quality of [0.82, 0.72, 0.62, 0.5, 0.4, 0.3]) {
      const url = canvas.toDataURL(type, quality)
      // A browser that can't encode the type answers with a PNG: try the next type.
      if (!url.startsWith(`data:${type}`)) break
      if (url.length <= PHOTO_MAX_CHARS) return url
    }
  }
  return null
}
