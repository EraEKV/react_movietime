import { useRef, type KeyboardEvent, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { clampCrop, coverScale, MAX_ZOOM, type Crop } from '../../utils/avatar'
import styles from './AvatarDialog.module.css'

/** The side of the round viewport in pixels (the saved photo is 256, from the same square). */
export const VIEW = 240
const STEP = 12

interface PhotoCropperProps {
  src: string
  width: number
  height: number
  crop: Crop
  onChange: (crop: Crop) => void
}

/**
 * A round window onto the photo: drag it (finger or mouse) or use the arrow keys to move,
 * the slider, the wheel or + / − to zoom. The photo always covers the circle.
 */
export default function PhotoCropper({ src, width, height, crop, onChange }: PhotoCropperProps) {
  const { t } = useTranslation('profile')
  const drag = useRef<{ x: number; y: number } | null>(null)
  const scale = coverScale(width, height, VIEW) * crop.zoom
  const set = (next: Crop) => onChange(clampCrop(width, height, VIEW, next))

  function down(event: PointerEvent<HTMLDivElement>) {
    drag.current = { x: event.clientX, y: event.clientY }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    const from = drag.current
    if (!from) return
    drag.current = { x: event.clientX, y: event.clientY }
    set({ ...crop, x: crop.x + event.clientX - from.x, y: crop.y + event.clientY - from.y })
  }
  function key(event: KeyboardEvent<HTMLDivElement>) {
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-STEP, 0],
      ArrowRight: [STEP, 0],
      ArrowUp: [0, -STEP],
      ArrowDown: [0, STEP],
    }
    const delta = moves[event.key]
    if (delta) set({ ...crop, x: crop.x + delta[0], y: crop.y + delta[1] })
    else if (event.key === '+' || event.key === '=') set({ ...crop, zoom: crop.zoom + 0.1 })
    else if (event.key === '-') set({ ...crop, zoom: crop.zoom - 0.1 })
    else return
    event.preventDefault()
  }

  return (
    <div className={styles.cropper}>
      <div
        className={styles.viewport}
        style={{ width: VIEW, height: VIEW }}
        role="group"
        tabIndex={0}
        aria-label={t('avatar.photo.cropLabel')}
        data-testid="crop-viewport"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        onWheel={(event) => set({ ...crop, zoom: crop.zoom - event.deltaY / 400 })}
        onKeyDown={key}
      >
        <img
          src={src}
          alt=""
          draggable={false}
          style={{
            width: width * scale,
            height: height * scale,
            left: VIEW / 2 + crop.x - (width * scale) / 2,
            top: VIEW / 2 + crop.y - (height * scale) / 2,
          }}
        />
      </div>
      <label className={styles.zoom}>
        <span>{t('avatar.photo.zoom')}</span>
        <input
          type="range"
          min={1}
          max={MAX_ZOOM}
          step={0.01}
          value={crop.zoom}
          onChange={(event) => set({ ...crop, zoom: Number(event.target.value) })}
        />
      </label>
      <p className={styles.hint}>{t('avatar.photo.cropHint')}</p>
    </div>
  )
}
