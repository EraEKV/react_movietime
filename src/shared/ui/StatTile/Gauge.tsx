import { PolarAngleAxis, RadialBar, RadialBarChart } from 'recharts'
import styles from './StatTile.module.css'

const SIZE = 44

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * A small progress ring for a tile (0…1). Decorative: the same figure is printed in the
 * tile, so the ring is hidden from assistive technology.
 */
export default function Gauge({ value }: { value: number }) {
  const share = Math.min(1, Math.max(0, value))
  return (
    <span className={styles.gauge} aria-hidden="true">
      <RadialBarChart
        width={SIZE}
        height={SIZE}
        data={[{ share }]}
        innerRadius={14}
        outerRadius={21}
        barSize={7}
        startAngle={90}
        endAngle={-270}
        role="presentation"
        accessibilityLayer={false}
      >
        <PolarAngleAxis type="number" domain={[0, 1]} tick={false} />
        <RadialBar
          dataKey="share"
          cornerRadius={4}
          fill="var(--accent)"
          background={{ fill: 'var(--surface-sunken)' }}
          isAnimationActive={!reducedMotion()}
          animationDuration={700}
        />
      </RadialBarChart>
    </span>
  )
}
