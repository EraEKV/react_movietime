import { useId, useState, type FormEvent } from 'react'
import type { NewWatchlistEntry, WatchlistFormValues } from '../../types/watchlist'
import { isWatchStatus, NOTES_MAX, SCORE_OPTIONS, WATCH_STATUSES } from '../../utils/watchlist'
import Button from '../Button/Button'
import SelectField from '../SelectField/SelectField'
import SeriesPicker from '../SeriesPicker/SeriesPicker'
import styles from './WatchlistForm.module.css'

type FormErrors = Partial<Record<'series' | 'notes' | 'score', string>>

function validate(
  values: WatchlistFormValues,
  isDuplicate: (seriesId: number) => boolean,
): FormErrors {
  const errors: FormErrors = {}
  if (!values.series) errors.series = 'Pick a series from the search results.'
  else if (isDuplicate(values.series.seriesId))
    errors.series = 'This series is already in your watchlist.'
  if (values.notes.length > NOTES_MAX)
    errors.notes = `Notes can be at most ${NOTES_MAX} characters.`
  if (values.status === 'completed' && !values.score)
    errors.score = 'Give a score to series you have completed.'
  return errors
}

/**
 * Controlled form for adding or editing a watchlist entry. Every field's value comes
 * from state and every change goes through a handler — the DOM never owns the data.
 *
 * Initial values are read only on mount; the parent passes a `key` so that a different
 * entry (or a series preselected from the URL) mounts a fresh form.
 */
interface WatchlistFormProps {
  initialValues: WatchlistFormValues
  mode?: 'add' | 'edit'
  isDuplicate?: (seriesId: number) => boolean
  onSubmit: (data: NewWatchlistEntry) => void
  onCancel: () => void
}

export default function WatchlistForm({
  initialValues,
  mode = 'add',
  isDuplicate = () => false,
  onSubmit,
  onCancel,
}: WatchlistFormProps) {
  const baseId = useId()
  const [values, setValues] = useState(initialValues)
  const [submitted, setSubmitted] = useState(false)

  // Errors are derived from the current values, not stored — they can't go stale.
  const errors = validate(values, isDuplicate)
  const showErrors = submitted && Object.keys(errors).length > 0

  function setField<K extends keyof WatchlistFormValues>(field: K, value: WatchlistFormValues[K]) {
    setValues((prev) => ({ ...prev, [field]: value }))
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitted(true)
    if (Object.keys(errors).length > 0 || !values.series) return

    onSubmit({
      ...values.series,
      status: values.status,
      score: values.score ? Number(values.score) : null,
      notes: values.notes.trim(),
    })
  }

  const errorId = (field: keyof FormErrors) => `${baseId}-${field}-error`

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <fieldset className={styles.field} disabled={mode === 'edit'}>
        <legend className={styles.label}>Series</legend>
        {mode === 'edit' ? (
          <p className={styles.fixed}>{values.series?.name}</p>
        ) : (
          <SeriesPicker
            value={values.series}
            onChange={(series) => setField('series', series)}
            invalid={showErrors && Boolean(errors.series)}
            errorId={errorId('series')}
          />
        )}
        {showErrors && errors.series && (
          <p id={errorId('series')} className={styles.error}>
            {errors.series}
          </p>
        )}
      </fieldset>

      <fieldset className={styles.field}>
        <legend className={styles.label}>Status</legend>
        <div className={styles.segments}>
          {WATCH_STATUSES.map((status) => (
            <label key={status.value} className={styles.segment}>
              <input
                type="radio"
                name={`${baseId}-status`}
                value={status.value}
                checked={values.status === status.value}
                onChange={(e) => {
                  if (isWatchStatus(e.target.value)) setField('status', e.target.value)
                }}
              />
              <span>{status.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className={styles.field}>
        <SelectField
          label="Your score"
          value={values.score}
          options={SCORE_OPTIONS}
          onChange={(value) => setField('score', value)}
        />
        {showErrors && errors.score && <p className={styles.error}>{errors.score}</p>}
      </div>

      <div className={styles.field}>
        <div className={styles.labelRow}>
          <label htmlFor={`${baseId}-notes`} className={styles.label}>
            Notes
          </label>
          <span className={styles.counter} data-over={values.notes.length > NOTES_MAX || undefined}>
            {values.notes.length} / {NOTES_MAX}
          </span>
        </div>
        <textarea
          id={`${baseId}-notes`}
          className={styles.textarea}
          rows={4}
          value={values.notes}
          onChange={(e) => setField('notes', e.target.value)}
          placeholder="Where you stopped, who recommended it, what you think so far…"
          aria-invalid={showErrors && Boolean(errors.notes)}
        />
        {showErrors && errors.notes && <p className={styles.error}>{errors.notes}</p>}
      </div>

      <div className={styles.actions}>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{mode === 'edit' ? 'Save changes' : 'Add to watchlist'}</Button>
      </div>
    </form>
  )
}
