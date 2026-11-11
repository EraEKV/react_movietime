import styles from './Dashboard.module.css'

interface ChartTooltipProps {
  active?: boolean
  title: string
  value: string
}

/** The small card shown over a chart mark: what it is and its number. */
export default function ChartTooltip({ active, title, value }: ChartTooltipProps) {
  if (!active) return null
  return (
    <div className={styles.tooltip} role="presentation">
      <span className={styles.tooltipTitle}>{title}</span>
      <strong className={styles.tooltipValue}>{value}</strong>
    </div>
  )
}
