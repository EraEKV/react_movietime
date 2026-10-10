import { useId, useState } from 'react'
import { NOTES_MAX, SCORE_OPTIONS, WATCH_STATUSES } from '../../utils/watchlist.js'
import Button from '../Button/Button.jsx'
import SelectField from '../SelectField/SelectField.jsx'
import SeriesPicker from '../SeriesPicker/SeriesPicker.jsx'
import styles from './WatchlistForm.module.css'

function validate(values, isDuplicate) {
  const errors = {}
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
export default function WatchlistForm({
  initialValues,
  mode = 'add',
  isDuplicate = () => false,
  onSubmit,
  onCancel,
}) {
  const baseId = useId()
  const [values, setValues] = useState(initialValues)
  const [submitted, setSubmitted] = useState(false)

  // Errors are derived from the current values, not stored — they can't go stale.
  const errors = validate(values, isDuplicate)
  const showErrors = submitted && Object.keys(errors).length > 0

  function setField(field, value) {
    setValues((prev) => ({ ...prev, [field]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    setSubmitted(true)
    if (Object.keys(errors).length > 0) return

    onSubmit({
      ...values.series,
      status: values.status,
      score: values.score ? Number(values.score) : null,
      notes: values.notes.trim(),
    })
  }

  const errorId = (field) => `${baseId}-${field}-error`

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <fieldset className={styles.field} disabled={mode === 'edit'}>
        <legend className={styles.label}>Series</legend>
        {mode === 'edit' ? (
          <p className={styles.fixed}>{values.series.name}</p>
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
                onChange={(e) => setField('status', e.target.value)}
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
