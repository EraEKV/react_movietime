import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'
import BackButton from '../shared/ui/BackButton/BackButton'
import SeriesDetails from '../components/SeriesDetails/SeriesDetails'
import ButtonLink from '../shared/ui/ButtonLink/ButtonLink'
import ErrorState from '../shared/ui/EmptyState/ErrorState'

export default function SeriesPage() {
  const { t } = useTranslation('catalog')
  const { id = '' } = useParams()

  if (!/^\d+$/.test(id)) {
    return (
      <>
        <BackButton />
        <ErrorState
          icon="link"
          title={t('details.badSeriesLink')}
          body={t('details.badSeriesId', { id })}
          secondary={
            <ButtonLink to="/series" variant="primary" icon="compass">
              {t('details.browseSeries')}
            </ButtonLink>
          }
        />
      </>
    )
  }

  // Going from /series/1396 to /series/60059 renders the same component at the same
  // place in the tree, so React would keep its state (e.g. a playing trailer).
  // A key tied to the id makes React treat each series as a new component and reset it.
  return <SeriesDetails key={id} seriesId={id} />
}
