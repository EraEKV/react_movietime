import { useTranslation } from 'react-i18next'
import { useId } from 'react'
import { SCORES, scoreWord, type Score } from '../../utils/library'
import { buttonClass } from '../../shared/ui/Button/variants'
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
  const { t } = useTranslation()
  const hintId = useId()
  const word = value ? scoreWord(value as Score) : null
  return (
    <fieldset className={styles.group} aria-describedby={hintId}>
      <legend className={styles.legend}>{t('score.legend')}</legend>
      <div className={styles.buttons}>
        {SCORES.map((score) => {
          const pressed = score === value
          return (
            <button
              key={score}
              type="button"
              className={buttonClass(pressed ? 'primary' : 'secondary', 'md', {
                className: styles.button,
              })}
              aria-pressed={pressed}
              aria-label={t('score.option', { score, label: scoreWord(score) })}
              onClick={() => onChange(pressed ? null : score)}
            >
              {score}
            </button>
          )
        })}
      </div>
      <p id={hintId} className={styles.hint} aria-live="polite">
        {word ? t('score.hint', { value, word }) : t('score.none')}
      </p>
    </fieldset>
  )
}
