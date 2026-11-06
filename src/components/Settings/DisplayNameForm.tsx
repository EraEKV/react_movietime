import i18n from '../../shared/i18n'
import { useTranslation } from 'react-i18next'
import { useRef, useState, type FormEvent } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useForm } from '../../shared/hooks/useForm'
import { useTimedState } from '../../shared/hooks/useTimedState'
import { offlineMessage } from '../../utils/listErrors'
import Button from '../../shared/ui/Button/Button'
import Icon from '../../shared/ui/Icon/Icon'
import TextField from '../../shared/ui/TextField/TextField'
import styles from './Settings.module.css'

/** Same limit as firestore.rules (validProfile) and profileService. */
const MAX_NAME = 40

function validateName(value: string): string | null {
  const name = value.trim()
  if (name.length === 0) return i18n.t('profile:name.required')
  if (name.length > MAX_NAME) return i18n.t('profile:name.tooLong', { max: MAX_NAME })
  return null
}

type SaveState = { kind: 'idle' } | { kind: 'saving' } | { kind: 'error'; message: string }

interface DisplayNameFormProps {
  /** The current name; the form starts with it. */
  initialName: string
}

/**
 * Display name with the full form cycle: validation on blur/submit, focus on the invalid
 * field, Saving… on the button, an error under the field, and a short "Saved" after.
 */
export default function DisplayNameForm({ initialName }: DisplayNameFormProps) {
  const { t } = useTranslation('profile')
  const { updateDisplayName } = useAuth()
  const form = useForm({ name: initialName }, (v) => ({ name: validateName(v.name) }))
  const [save, setSave] = useState<SaveState>({ kind: 'idle' })
  const [saved, showSaved] = useTimedState<true>(3000)
  // What the account has now: Save stays disabled until the field differs from it.
  const [current, setCurrent] = useState(initialName)
  const inputRef = useRef<HTMLInputElement>(null)

  const name = form.values.name.trim()
  const unchanged = name === current

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.trySubmit()) {
      // Move focus to the field with the error, so keyboard and screen reader users land on it.
      inputRef.current?.focus()
      return
    }
    if (unchanged) return
    if (!navigator.onLine) {
      setSave({ kind: 'error', message: offlineMessage() })
      inputRef.current?.focus()
      return
    }

    setSave({ kind: 'saving' })
    const error = await updateDisplayName(name)
    if (error) {
      setSave({ kind: 'error', message: error.message })
      inputRef.current?.focus()
      return
    }
    setSave({ kind: 'idle' })
    setCurrent(name)
    form.setValue('name', name)
    showSaved(true)
  }

  const fieldError = form.errors.name ?? (save.kind === 'error' ? save.message : null)

  return (
    <form className={styles.nameForm} onSubmit={(e) => void handleSubmit(e)} noValidate>
      <TextField
        ref={inputRef}
        label={t('name.label')}
        value={form.values.name}
        onChange={(value) => {
          form.setValue('name', value)
          if (save.kind === 'error') setSave({ kind: 'idle' })
        }}
        onBlur={() => form.blur('name')}
        error={fieldError}
        hint={t('name.hint', { length: name.length, max: MAX_NAME })}
        autoComplete="nickname"
        maxLength={MAX_NAME + 10}
        disabled={save.kind === 'saving'}
      />
      <div className={styles.formActions}>
        <Button
          type="submit"
          variant="primary"
          loading={save.kind === 'saving'}
          disabled={unchanged && save.kind !== 'saving'}
        >
          {save.kind === 'saving' ? t('name.saving') : t('name.save')}
        </Button>
        <span className={styles.saved} role="status">
          {saved && (
            <>
              <Icon name="check" size={16} /> {t('name.saved')}
            </>
          )}
        </span>
      </div>
    </form>
  )
}
