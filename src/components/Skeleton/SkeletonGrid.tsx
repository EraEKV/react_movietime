import { useTranslation } from 'react-i18next'
import PosterGrid from '../PosterCard/PosterGrid'
import PosterSkeleton from './PosterSkeleton'

/** Loading state in the exact shape of the poster grid. */
export default function SkeletonGrid({ count = 20, label }: { count?: number; label?: string }) {
  const { t } = useTranslation()
  return (
    <PosterGrid label={label ?? t('states.loadingTitles')} busy>
      {Array.from({ length: count }, (_, i) => (
        // Placeholders have no identity of their own, so the index is a fine key here.
        <li key={i}>
          <PosterSkeleton />
        </li>
      ))}
    </PosterGrid>
  )
}
