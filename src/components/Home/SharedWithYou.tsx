import { useTranslation } from 'react-i18next'
import { useSharedLists } from '../../hooks/useLists'
import ListCard from '../ListCard/ListCard'
import ListGrid from '../ListCard/ListGrid'
import Section from '../../shared/ui/Section/Section'
import SectionLink from '../../shared/ui/SectionHeader/SectionLink'

const SHOWN = 3

/**
 * Lists friends shared with you, newest activity first. Nothing shared (or still loading,
 * or failed) → the section is skipped: Home is a summary, the Lists page shows the states.
 */
export default function SharedWithYou() {
  const { t } = useTranslation('home')
  const shared = useSharedLists()
  if (shared.status !== 'success' || shared.data.length === 0) return null
  const email = shared.email ?? ''

  return (
    <Section
      title={t('shared.title')}
      aside={<SectionLink to="/lists">{t('shared.all')}</SectionLink>}
    >
      <ListGrid label={t('shared.title')}>
        {shared.data.slice(0, SHOWN).map((list) => (
          <li key={list.id}>
            <ListCard list={list} role={list.roles[email] ?? 'viewer'} />
          </li>
        ))}
      </ListGrid>
    </Section>
  )
}
