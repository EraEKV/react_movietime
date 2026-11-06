import { useTranslation } from 'react-i18next'
import type { FormEvent } from 'react'
import { useForm } from '../../shared/hooks/useForm'
import type { ListDraft } from '../../types/list'
import {
  cleanDraft,
  LIST_DESCRIPTION_MAX,
  LIST_EMOJIS,
  LIST_NAME_MAX,
  validateListDraft,
} from '../../utils/lists'
import Banner from '../Banner/Banner'
import Button from '../Button/Button'
import Textarea from '../Textarea/Textarea'
import TextField from '../TextField/TextField'
import EmojiPicker from './EmojiPicker'
import styles from './ListForm.module.css'

interface ListFormProps {
  initial: ListDraft
  submitLabel: string
  saving: boolean
  /** A failed save: shown above the buttons, the inputs keep what was typed. */
  error: string | null
  onSubmit: (draft: ListDraft) => void
  onCancel: () => void
}

/** Create and edit share this form; the page decides what "save" means. */
export default function ListForm({
  initial,
  submitLabel,
  saving,
  error,
  onSubmit,
  onCancel,
}: ListFormProps) {
  const { t } = useTranslation(['lists', 'common'])
  const form = useForm<keyof ListDraft>(initial, validateListDraft)
  const { values, errors } = form

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    if (form.trySubmit()) onSubmit(cleanDraft(values))
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <EmojiPicker
        options={LIST_EMOJIS}
        value={values.emoji}
        onChange={(emoji) => form.setValue('emoji', emoji)}
      />
      <TextField
        label={t('form.name')}
        value={values.name}
        onChange={(v) => form.setValue('name', v)}
        onBlur={() => form.blur('name')}
        error={errors.name}
        placeholder={t('form.namePlaceholder')}
        hint={t('form.nameHint', { max: LIST_NAME_MAX })}
        maxLength={LIST_NAME_MAX + 20}
        autoComplete="off"
        required
      />
      <Textarea
        label={t('form.description')}
        optional
        value={values.description}
        onChange={(v) => form.setValue('description', v)}
        onBlur={() => form.blur('description')}
        error={errors.description}
        maxLength={LIST_DESCRIPTION_MAX}
        rows={3}
        placeholder={t('form.descriptionPlaceholder')}
      />

      {error && (
        <Banner tone="warning" icon="alert">
          {error}
        </Banner>
      )}

      <div className={styles.actions}>
        <Button variant="ghost" onClick={onCancel}>
          {t('common:actions.cancel')}
        </Button>
        <Button type="submit" variant="primary" loading={saving}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
