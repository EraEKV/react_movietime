import { useTranslation } from 'react-i18next'
import Button from '../Button/Button'

interface ShowMoreProps {
  expanded: boolean
  total: number
  onToggle: () => void
  className?: string
}

/** The Show all N / Show less button under a collapsed list. */
export default function ShowMore({ expanded, total, onToggle, className }: ShowMoreProps) {
  const { t } = useTranslation('common')
  return (
    <Button variant="ghost" className={className} aria-expanded={expanded} onClick={onToggle}>
      {expanded ? t('actions.showLess') : t('actions.showAll', { count: total })}
    </Button>
  )
}
