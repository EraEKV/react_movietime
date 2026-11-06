import PosterGrid from '../PosterCard/PosterGrid'
import PosterSkeleton from './PosterSkeleton'

/** Loading state in the exact shape of the poster grid. */
export default function SkeletonGrid({
  count = 20,
  label = 'Loading titles',
}: {
  count?: number
  label?: string
}) {
  return (
    <PosterGrid label={label} busy>
      {Array.from({ length: count }, (_, i) => (
        // Placeholders have no identity of their own, so the index is a fine key here.
        <li key={i}>
          <PosterSkeleton />
        </li>
      ))}
    </PosterGrid>
  )
}
