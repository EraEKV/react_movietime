import i18n from '../../i18n'
import { useState } from 'react'
import { useLibrary } from '../../hooks/useLibrary'
import { useMyLists, useSharedLists } from '../../hooks/useLists'
import { useTitleSearch } from '../../hooks/useTitleSearch'
import type { SourcePick } from '../../hooks/usePlanSource'
import { episodeCode, getYear } from '../../utils/format'
import Banner from '../Banner/Banner'
import ButtonLink from '../ButtonLink/ButtonLink'
import ErrorState from '../EmptyState/ErrorState'
import RadioCards, { type RadioCardOption } from '../RadioCards/RadioCards'
import SegmentedControl from '../SegmentedControl/SegmentedControl'
import Skeleton from '../Skeleton/Skeleton'
import TextField from '../TextField/TextField'
import styles from './Planner.module.css'

const SHOWN = 6

interface SourceStepProps {
  kind: SourcePick['kind']
  onKindChange: (kind: SourcePick['kind']) => void
  pick: SourcePick | null
  onPick: (pick: SourcePick) => void
}

/** Step 1: a series (search or your library) or one of your lists. */
export default function SourceStep({ kind, onKindChange, pick, onPick }: SourceStepProps) {
  return (
    <div className={styles.stack}>
      <SegmentedControl
        label="What to plan"
        value={kind}
        onChange={onKindChange}
        options={[
          { value: 'series', label: 'A series', icon: 'tv' },
          { value: 'list', label: 'A list of movies', icon: 'list' },
        ]}
      />
      {kind === 'series' ? (
        <SeriesPicker pick={pick} onPick={onPick} />
      ) : (
        <ListPicker pick={pick} onPick={onPick} />
      )}
    </div>
  )
}

function SeriesPicker({ pick, onPick }: Pick<SourceStepProps, 'pick' | 'onPick'>) {
  const [query, setQuery] = useState('')
  const search = useTitleSearch(query)
  const { entries } = useLibrary()

  // Without a query: series from your library, the ones you're watching first.
  const order = { watching: 0, plan: 1, dropped: 2, completed: 3 }
  const fromLibrary = entries
    .filter((e) => e.mediaType === 'tv')
    .toSorted((a, b) => order[a.status] - order[b.status])
    .slice(0, SHOWN)
    .map((e) => ({
      pick: { kind: 'series', id: e.tmdbId, title: e.title, posterPath: e.posterPath } as const,
      description: [
        e.year,
        'in your library',
        e.progress && `last watched ${episodeCode(e.progress.season, e.progress.episode)}`,
      ]
        .filter(Boolean)
        .join(' · '),
    }))

  const searching = !search.tooShort
  const found =
    search.status === 'success'
      ? search.data
          .filter((m) => m.mediaType === 'tv')
          .slice(0, SHOWN)
          .map((m) => ({
            pick: { kind: 'series', id: m.id, title: m.title, posterPath: m.posterPath } as const,
            description: getYear(m.date) ?? 'Series',
          }))
      : []
  const choices = searching ? found : fromLibrary
  // The picked series stays visible even when it isn't in the current results.
  if (pick?.kind === 'series' && !choices.some((c) => c.pick.id === pick.id)) {
    choices.unshift({ pick, description: 'Selected' })
  }

  const options: RadioCardOption<string>[] = choices.map((c) => ({
    value: String(c.pick.id),
    label: c.pick.title || 'Selected series',
    description: c.description,
    icon: 'tv',
  }))

  return (
    <>
      <TextField
        label="Search series"
        hideLabel
        icon="search"
        type="search"
        placeholder="Search series by title"
        value={query}
        onChange={setQuery}
      />
      {searching && (search.status === 'loading' || search.pending) && (
        <div className={styles.stack} aria-busy="true" aria-label="Searching">
          <Skeleton height={64} radius="md" />
          <Skeleton height={64} radius="md" />
        </div>
      )}
      {searching && search.status === 'error' && (
        <ErrorState
          title="Search isn’t working right now"
          body={search.error.message}
          onRetry={search.reload}
          headingLevel="h3"
        />
      )}
      {searching && search.status === 'success' && found.length === 0 && (
        <p className={styles.muted}>No series match “{query.trim()}”.</p>
      )}
      {!searching && options.length === 0 && (
        <p className={styles.muted}>Search for a series to plan, for example “Breaking Bad”.</p>
      )}
      {options.length > 0 && (
        <RadioCards
          legend={searching ? 'Search results' : 'From your library'}
          options={options}
          value={pick?.kind === 'series' ? String(pick.id) : ''}
          onChange={(value) => {
            const choice = choices.find((c) => String(c.pick.id) === value)
            if (choice) onPick(choice.pick)
          }}
        />
      )}
    </>
  )
}

function ListPicker({ pick, onPick }: Pick<SourceStepProps, 'pick' | 'onPick'>) {
  const mine = useMyLists()
  const shared = useSharedLists()

  if (mine.status === 'error') {
    return (
      <ErrorState
        title="We couldn’t load your lists"
        body={mine.error.message}
        onRetry={mine.retry}
        headingLevel="h3"
      />
    )
  }
  if (mine.status !== 'success') {
    return (
      <div className={styles.stack} aria-busy="true" aria-label="Loading lists">
        <Skeleton height={64} radius="md" />
        <Skeleton height={64} radius="md" />
      </div>
    )
  }

  const lists = [...mine.data, ...(shared.status === 'success' ? shared.data : [])]
  if (lists.length === 0) {
    return (
      <Banner
        action={
          <ButtonLink to="/lists/new" size="sm" icon="plus">
            New list
          </ButtonLink>
        }
      >
        You don’t have any lists yet. Make one with the movies for your marathon.
      </Banner>
    )
  }

  return (
    <RadioCards
      legend="Your lists"
      value={pick?.kind === 'list' ? pick.id : ''}
      options={lists.map((list) => ({
        value: list.id,
        label: `${list.emoji} ${list.name}`,
        description: mine.data.some((m) => m.id === list.id)
          ? i18n.t('count.titles', { count: list.itemCount })
          : `${i18n.t('count.titles', { count: list.itemCount })} · by ${list.ownerName}`,
      }))}
      onChange={(id) => {
        const list = lists.find((l) => l.id === id)
        if (list) {
          onPick({
            kind: 'list',
            id: list.id,
            title: list.name,
            posterPath: list.covers[0] ?? null,
          })
        }
      }}
    />
  )
}
