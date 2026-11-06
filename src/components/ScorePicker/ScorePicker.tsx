import { useId } from 'react'
import { SCORE_WORDS } from '../../utils/library'
import { buttonClass } from '../Button/variants'
import styles from './ScorePicker.module.css'

interface ScorePickerProps {
  value: number | null
  onChange: (value: number | null) => void
}

/**
 * Ten toggle buttons (aria-pressed). Pressing the selected score again clears it,
 * so "not scored" is reachable without a separate control.
 */
export default function ScorePicker({ value, onChange }: ScorePickerProps) {
  const hintId = useId()
  const word = value ? SCORE_WORDS[value - 1] : null
  return (
    <fieldset className={styles.group} aria-describedby={hintId}>
      <legend className={styles.legend}>Your score</legend>
      <div className={styles.buttons}>
        {SCORE_WORDS.map((label, i) => {
          const score = i + 1
          const pressed = score === value
          return (
            <button
              key={score}
              type="button"
              className={buttonClass(pressed ? 'primary' : 'secondary', 'md', {
                className: styles.button,
              })}
              aria-pressed={pressed}
              aria-label={`${score}, ${label}`}
              onClick={() => onChange(pressed ? null : score)}
            >
              {score}
            </button>
          )
        })}
      </div>
      <p id={hintId} className={styles.hint} aria-live="polite">
        {word ? `${value} — ${word}. Press it again to clear.` : 'Not scored yet.'}
      </p>
    </fieldset>
  )
}
