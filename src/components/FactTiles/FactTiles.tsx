import { useTranslation } from 'react-i18next'
import Card from '../Card/Card'
import styles from './FactTiles.module.css'

export interface Fact {
  label: string
  /** null renders the fallback, so the grid keeps its shape when TMDB has no data. */
  value: string | null
}

interface FactTilesProps {
  facts: Fact[]
  label: string
  fallback?: string
}

/** A row of label/value tiles: director, budget, revenue, runtime on a movie page. */
export default function FactTiles({ facts, label, fallback }: FactTilesProps) {
  const { t } = useTranslation()
  return (
    <dl className={styles.grid} aria-label={label}>
      {facts.map((fact) => (
        <Card key={fact.label} className={styles.tile}>
          <dt className={styles.label}>{fact.label}</dt>
          <dd className={fact.value ? styles.value : styles.missing}>
            {fact.value ?? fallback ?? t('states.unknown')}
          </dd>
        </Card>
      ))}
    </dl>
  )
}
