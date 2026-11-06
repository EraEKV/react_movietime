import type { CSSProperties } from 'react'
import styles from './Skeleton.module.css'

type Radius = 'xs' | 'sm' | 'md' | 'lg' | 'pill'

interface SkeletonProps {
  width?: CSSProperties['width']
  height?: CSSProperties['height']
  radius?: Radius
  /** e.g. '2 / 3' for a poster; height then follows the width. */
  ratio?: string
}

/** Placeholder block in the shape of the content that is loading. Hidden from screen readers. */
export default function Skeleton({ width = '100%', height = 16, radius, ratio }: SkeletonProps) {
  return (
    <div
      className={styles.skeleton}
      aria-hidden="true"
      style={{
        width,
        height: ratio ? 'auto' : height,
        aspectRatio: ratio,
        borderRadius: radius ? `var(--radius-${radius})` : undefined,
      }}
    />
  )
}
