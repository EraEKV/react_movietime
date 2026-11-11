import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { useLibrary } from '../../hooks/useLibrary'
import { useMyLists, useSharedLists } from '../../hooks/useLists'
import { useTitleSearch } from '../../hooks/useTitleSearch'
import type { PickerKind, SourcePick } from '../../hooks/usePlanSource'
import { episodeCode, getYear } from '../../shared/lib/format'
import Banner from '../../shared/ui/Banner/Banner'
import ButtonLink from '../../shared/ui/ButtonLink/ButtonLink'
import ErrorState from '../../shared/ui/EmptyState/ErrorState'
import RadioCards, { type RadioCardOption } from '../../shared/ui/RadioCards/RadioCards'
import SegmentedControl from '../../shared/ui/SegmentedControl/SegmentedControl'
import Skeleton from '../../shared/ui/Skeleton/Skeleton'
import TextField from '../../shared/ui/TextField/TextField'
import styles from './Planner.module.css'

const SHOWN = 6

interface SourceStepProps {
  kind: PickerKind
  onKindChange: (kind: PickerKind) => void
  pick: SourcePick | null
  onPick: (pick: SourcePick) => void
}

/** Step 1: a series or a movie (search or your library) or one of your lists. */
export default function SourceStep({ kind, onKindChange, pick, onPick }: SourceStepProps) {
  const { t } = useTranslation('planner')
  return (
    <div className={styles.stack}>
      <SegmentedControl
        label={t('source.what')}
        stacked
        value={kind}
        onChange={onKindChange}
        options={[
          { value: 'series', label: t('source.series'), icon: 'tv' },
          { value: 'movie', label: t('source.movie'), icon: 'film' },
          { value: 'list', label: t('source.list'), icon: 'list' },
        ]}
      />
      {kind === 'list' ? (
        <ListPicker pick={pick} onPick={onPick} />
      ) : (
        <TitlePicker kind={kind} pick={pick} onPick={onPick} />
      )}
    </div>
  )
}

/** Search (or your library) for one title: the series or the film to plan. */
function TitlePicker({
  kind,
  pick,
  onPick,
}: Pick<SourceStepProps, 'pick' | 'onPick'> & { kind: 'series' | 'movie' }) {
  const { t } = useTranslation(['planner', 'common', 'library'])
  const mediaType = kind === 'movie' ? 'movie' : 'tv'
  // Keys of the copy that differs between the two kinds.
  const word = kind === 'movie' ? 'Movie' : ''
  const [query, setQuery] = useState('')
  const search = useTitleSearch(query)
  const { entries } = useLibrary()

  // Without a query: series from your library, the ones you're watching first.
  const order = { watching: 0, plan: 1, dropped: 2, completed: 3 }
  const fromLibrary = entries
    .filter((e) => e.mediaType === mediaType)
    .toSorted((a, b) => order[a.status] - order[b.status])
    .slice(0, SHOWN)
    .map((e) => ({
      pick: { kind, id: e.tmdbId, title: e.title, posterPath: e.posterPath } as const,
      description: [
        e.year,
        t('source.inLibrary'),
        e.progress &&
          t('source.lastWatched', { code: episodeCode(e.progress.season, e.progress.episode) }),
      ]
        .filter(Boolean)
        .join(' · '),
    }))

  const searching = !search.tooShort
  const found =
    search.status === 'success'
      ? search.data
          .filter((m) => m.mediaType === mediaType)
          .slice(0, SHOWN)
          .map((m) => ({
            pick: { kind, id: m.id, title: m.title, posterPath: m.posterPath } as const,
            description: getYear(m.date) ?? t(`library:${kind}`),
          }))
      : []
  const choices = searching ? found : fromLibrary
  // The picked series stays visible even when it isn't in the current results.
  if (pick?.kind === kind && !choices.some((c) => c.pick.id === pick.id)) {
    choices.unshift({ pick, description: t('source.selected') })
  }

  const options: RadioCardOption<string>[] = choices.map((c) => ({
    value: String(c.pick.id),
    label: c.pick.title || t(`source.selected${kind === 'movie' ? 'Movie' : 'Series'}`),
    description: c.description,
    icon: kind === 'movie' ? 'film' : 'tv',
  }))

  return (
    <>
      <TextField
        label={t(`source.search${word}`)}
        hideLabel
        icon="search"
        type="search"
        placeholder={t(`source.placeholder${word}`)}
        value={query}
        onChange={setQuery}
      />
      {searching && (search.status === 'loading' || search.pending) && (
        <div className={styles.stack} aria-busy="true" aria-label={t('source.searching')}>
          <Skeleton height={64} radius="md" />
          <Skeleton height={64} radius="md" />
        </div>
      )}
      {searching && search.status === 'error' && (
        <ErrorState
          title={t('source.searchError')}
          body={search.error.message}
          onRetry={search.reload}
          headingLevel="h3"
        />
      )}
      {searching && search.status === 'success' && found.length === 0 && (
        <p className={styles.muted}>{t(`source.noMatch${word}`, { query: query.trim() })}</p>
      )}
      {!searching && options.length === 0 && (
        <p className={styles.muted}>{t(`source.hint${word}`)}</p>
      )}
      {options.length > 0 && (
        <RadioCards
          legend={searching ? t('source.results') : t('source.fromLibrary')}
          options={options}
          value={pick?.kind === kind ? String(pick.id) : ''}
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
  const { t } = useTranslation(['planner', 'common', 'lists'])
  const mine = useMyLists()
  const shared = useSharedLists()

  if (mine.status === 'error') {
    return (
      <ErrorState
        title={t('source.listsError')}
        body={mine.error.message}
        onRetry={mine.retry}
        headingLevel="h3"
      />
    )
  }
  if (mine.status !== 'success') {
    return (
      <div className={styles.stack} aria-busy="true" aria-label={t('source.loadingLists')}>
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
            {t('source.newList')}
          </ButtonLink>
        }
      >
        {t('source.noLists')}
      </Banner>
    )
  }

  return (
    <RadioCards
      legend={t('source.yourLists')}
      value={pick?.kind === 'list' ? pick.id : ''}
      options={lists.map((list) => ({
        value: list.id,
        label: `${list.emoji} ${list.name}`,
        description: mine.data.some((m) => m.id === list.id)
          ? t('common:count.titles', { count: list.itemCount })
          : t('lists:items.byOwner', {
              count: t('common:count.titles', { count: list.itemCount }),
              owner: list.ownerName,
            }),
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
