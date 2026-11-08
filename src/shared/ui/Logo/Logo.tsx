import { useTranslation } from 'react-i18next'
import { useId } from 'react'
import { Link } from 'react-router'
import styles from './Logo.module.css'

/** Gradient tile with a clock hand: "movie" + "time". */
export function LogoMark({ size = 28 }: { size?: number }) {
  // Each mark needs its own gradient id, or two logos on a page would share one <defs>.
  const gradientId = useId()
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--brand-teal)' }} />
          <stop offset="1" style={{ stopColor: 'var(--brand-lime)' }} />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="28" height="28" rx="9" fill={`url(#${gradientId})`} />
      <path
        d="M16 9v7l5 3"
        style={{ stroke: 'var(--on-accent)' }}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="16" cy="16" r="1.8" style={{ fill: 'var(--on-accent)' }} />
    </svg>
  )
}

export default function Logo({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation()
  return (
    <Link to="/" className={styles.logo} aria-label={t('layout.homeLink')}>
      <LogoMark />
      {!compact && <span className={styles.word}>avleron</span>}
    </Link>
  )
}
