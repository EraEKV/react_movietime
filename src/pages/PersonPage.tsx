import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'
import BackButton from '../shared/ui/BackButton/BackButton'
import ButtonLink from '../shared/ui/ButtonLink/ButtonLink'
import ErrorState from '../shared/ui/EmptyState/ErrorState'
import PersonDetails from '../components/PersonDetails/PersonDetails'

export default function PersonPage() {
  const { t } = useTranslation('person')
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

  // The key resets the page state (filters, folded biography) when going person → person.
  return <PersonDetails key={id} personId={id} />
}
