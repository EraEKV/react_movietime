import { useTranslation } from 'react-i18next'
import { useState, type FormEvent } from 'react'
import { endpoints } from '../../shared/api/tmdb'
import { useFetch } from '../../shared/hooks/useFetch'
import type {
  LibraryChanges,
  LibraryEntry,
  LibraryStatus,
  SeriesProgress,
} from '../../types/library'
import type { SeasonSummary } from '../../types/tmdb'
import { episodeCode } from '../../shared/lib/format'
import { LIBRARY_STATUSES, NOTES_MAX, watchedUpTo } from '../../utils/library'
import Button from '../../shared/ui/Button/Button'
import ProgressBar from '../../shared/ui/ProgressBar/ProgressBar'
import RadioCards from '../../shared/ui/RadioCards/RadioCards'
import ScorePicker from '../ScorePicker/ScorePicker'
import SelectField from '../../shared/ui/SelectField/SelectField'
import { STATUS_ICON } from '../StatusMarker/statusIcons'
import Textarea from '../../shared/ui/Textarea/Textarea'
import styles from './LibraryEntryForm.module.css'

interface LibraryEntryFormProps {
  entry: LibraryEntry
  onSave: (changes: LibraryChanges) => void
  onCancel: () => void
  onRemove: () => void
}

/**
 * Local form state, initialised from the entry once. The page renders this with
 * key={entry.key}, so another entry gets a fresh form instead of stale values.
 */
export default function LibraryEntryForm({
  entry,
  onSave,
  onCancel,
  onRemove,
}: LibraryEntryFormProps) {
  const { t } = useTranslation(['library', 'common'])
  const [status, setStatus] = useState<LibraryStatus>(entry.status)
  const [score, setScore] = useState<number | null>(entry.score)
  const [notes, setNotes] = useState(entry.notes)
  const [progress, setProgress] = useState<SeriesProgress | null>(entry.progress)
  const [submitted, setSubmitted] = useState(false)

  // Validation is derived from the values, never stored.
  const notesError = notes.length > NOTES_MAX ? t('form.notesTooLong', { max: NOTES_MAX }) : null
  const showNotesError = submitted || notes.length > NOTES_MAX

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (notesError) return
    onSave({ status, score, notes: notes.trim(), progress })
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <RadioCards
        legend={t('form.status')}
        value={status}
        onChange={setStatus}
        options={LIBRARY_STATUSES.map((s) => ({ ...s, icon: STATUS_ICON[s.value] }))}
      />

      <ScorePicker value={score} onChange={setScore} />

      {entry.mediaType === 'tv' && (
        <SeriesProgressFields
          tmdbId={entry.tmdbId}
          totalEpisodes={entry.totalEpisodes}
          value={progress}
          onChange={setProgress}
        />
      )}

      <Textarea
        label={t('form.notes')}
        optional
        value={notes}
        onChange={setNotes}
        maxLength={NOTES_MAX}
        error={showNotesError ? notesError : null}
        placeholder={t('form.notesPlaceholder')}
      />

      <div className={styles.actions}>
        <Button variant="danger" icon="trash" onClick={onRemove}>
          {t('button.remove')}
        </Button>
        <div className={styles.end}>
          <Button variant="ghost" onClick={onCancel}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" variant="primary">
            {t('form.saveChanges')}
          </Button>
        </div>
      </div>
    </form>
  )
}

interface SeriesProgressProps {
  tmdbId: number
  totalEpisodes: number | null
  value: SeriesProgress | null
  onChange: (value: SeriesProgress | null) => void
}

/** Season + last watched episode. Season sizes come from TMDB (/tv/{id}). */
function SeriesProgressFields({ tmdbId, totalEpisodes, value, onChange }: SeriesProgressProps) {
  const { t } = useTranslation('library')
  const { status, data } = useFetch<{ seasons: SeasonSummary[]; number_of_episodes: number }>(
    endpoints.seriesSummary(tmdbId),
  )

  if (status !== 'success') {
    return (
      <p className={styles.muted} aria-live="polite">
        {status === 'error' ? t('form.seasonsError') : t('form.seasonsLoading')}
      </p>
    )
  }

  const seasons = data.seasons.filter((s) => s.season_number > 0 && s.episode_count > 0)
  const total = data.number_of_episodes || totalEpisodes || 0
  const current = seasons.find((s) => s.season_number === value?.season)

  function select(season: number, episode: number) {
    if (season === 0) return onChange(null)
    onChange({ season, episode, watchedEpisodes: watchedUpTo(seasons, season, episode) })
  }

  const seasonOptions = [
    { value: '0', label: t('form.notStarted') },
    ...seasons.map((s) => ({
      value: String(s.season_number),
      label: t('form.seasonN', { n: s.season_number }),
    })),
  ]
  const episodeOptions = current
    ? Array.from({ length: current.episode_count }, (_, i) => ({
        value: String(i + 1),
        label: t('form.episodeN', { n: i + 1 }),
      }))
    : [{ value: '0', label: '—' }]

  const ratio = value && total ? value.watchedEpisodes / total : 0

  return (
    <div className={styles.progress}>
      <div className={styles.row}>
        <SelectField
          label={t('form.season')}
          value={String(value?.season ?? 0)}
          options={seasonOptions}
          // A new season starts from its first episode.
          onChange={(season) => select(Number(season), 1)}
        />
        <SelectField
          label={t('form.lastEpisode')}
          disabled={!current}
          value={String(value?.episode ?? 0)}
          options={episodeOptions}
          onChange={(episode) => select(value?.season ?? 0, Number(episode))}
        />
      </div>
      <ProgressBar
        value={ratio}
        label={t('form.progress')}
        caption={
          value
            ? `${episodeCode(value.season, value.episode)} · ${t('form.progressCaption', { done: value.watchedEpisodes, count: total })}`
            : t('form.progressCaption', { done: 0, count: total })
        }
      />
    </div>
  )
}
