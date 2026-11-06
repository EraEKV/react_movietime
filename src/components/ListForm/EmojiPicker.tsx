import { useTranslation } from 'react-i18next'
import { cx } from '../../shared/lib/cx'
import styles from './ListForm.module.css'

interface EmojiPickerProps {
  options: readonly string[]
  value: string
  onChange: (emoji: string) => void
}

/**
 * A radio group drawn as emoji tiles: native radios give arrow-key navigation and
 * "1 of 16, selected" announcements for free.
 */
export default function EmojiPicker({ options, value, onChange }: EmojiPickerProps) {
  const { t } = useTranslation('lists')
  return (
    <fieldset className={styles.emojiSet}>
      <legend className={styles.legend}>{t('form.emoji')}</legend>
      <div className={styles.emojiGrid}>
        {options.map((emoji) => (
          <label key={emoji} className={cx(styles.emoji, emoji === value && styles.emojiOn)}>
            <input
              type="radio"
              name="list-emoji"
              value={emoji}
              checked={emoji === value}
              onChange={() => onChange(emoji)}
              aria-label={t('form.emojiOption', { emoji })}
            />
            <span aria-hidden="true">{emoji}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
