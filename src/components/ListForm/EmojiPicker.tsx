import { cx } from '../../utils/cx'
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
  return (
    <fieldset className={styles.emojiSet}>
      <legend className={styles.legend}>Cover emoji</legend>
      <div className={styles.emojiGrid}>
        {options.map((emoji) => (
          <label key={emoji} className={cx(styles.emoji, emoji === value && styles.emojiOn)}>
            <input
              type="radio"
              name="list-emoji"
              value={emoji}
              checked={emoji === value}
              onChange={() => onChange(emoji)}
              aria-label={`Emoji ${emoji}`}
            />
            <span aria-hidden="true">{emoji}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
