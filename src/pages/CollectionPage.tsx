import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'
import BackButton from '../shared/ui/BackButton/BackButton'
import ButtonLink from '../shared/ui/ButtonLink/ButtonLink'
import ErrorState from '../shared/ui/EmptyState/ErrorState'
import CollectionDetails from '../components/CollectionDetails/CollectionDetails'

export default function CollectionPage() {
  const { t } = useTranslation('collection')
  const { id = '' } = useParams()

  // Checked before any request: TMDB ids are positive integers.
  if (!/^\d+$/.test(id)) {
    return (
      <>
        <BackButton />
        <ErrorState
          icon="link"
          title={t('badLink')}
          body={t('badId', { id })}
          secondary={
            <ButtonLink to="/movies" variant="primary" icon="compass">
              {t('browse')}
            </ButtonLink>
          }
        />
      </>
    )
  }

  return <CollectionDetails key={id} collectionId={id} />
}
