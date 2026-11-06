import ButtonLink from '../ButtonLink/ButtonLink'
import Card from '../Card/Card'
import EmptyState from '../EmptyState/EmptyState'
import Section from '../Section/Section'
import SectionLink from '../SectionHeader/SectionLink'

const todayLabel = () =>
  new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(
    new Date(),
  )

/**
 * Today's and tomorrow's sessions. Plans arrive with the planner phase; until then this is
 * the empty state from the design: what will appear here and the one action that fills it.
 */
export default function UpNextSection() {
  return (
    <Section
      title="Up next"
      kicker={todayLabel()}
      aside={<SectionLink to="/planner">Open planner</SectionLink>}
    >
      <Card>
        <EmptyState
          icon="calendar"
          headingLevel="h3"
          title="Nothing planned tonight"
          body="Plan a series or a movie night, and your next sessions will show up here."
          actions={
            <ButtonLink to="/planner" variant="primary" icon="plus">
              Create a plan
            </ButtonLink>
          }
        />
      </Card>
    </Section>
  )
}
