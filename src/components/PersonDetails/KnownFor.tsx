import { useTranslation } from 'react-i18next'
import type { LibraryStatus } from '../../types/library'
import type { MediaKey } from '../../types/media'
import type { PersonWork } from '../../utils/person'
import PosterRow from '../PosterRow/PosterRow'
import Section from '../../shared/ui/Section/Section'
import WorkCard from './WorkCard'

/** The person's best-known works as a row at the top, before the full filmography. */
export default function KnownFor({
  works,
  statuses,
}: {
  works: PersonWork[]
  statuses: ReadonlyMap<MediaKey, LibraryStatus>
}) {
  const { t } = useTranslation('person')
  if (works.length === 0) return null
  return (
    <Section title={t('knownFor')}>
      <PosterRow label={t('knownForLabel')}>
        {works.map((work) => (
          <li key={work.key}>
            <WorkCard work={work} status={statuses.get(work.key)} />
          </li>
        ))}
      </PosterRow>
    </Section>
  )
}
