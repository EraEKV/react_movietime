import { useTranslation } from 'react-i18next'
import { useState, type FormEvent } from 'react'
import type { ListItem } from '../../types/list'
import { LIST_NOTE_MAX } from '../../utils/lists'
import Button from '../Button/Button'
import Dialog from '../Dialog/Dialog'
import Textarea from '../Textarea/Textarea'

interface NoteDialogProps {
  item: ListItem
  onSave: (note: string) => void
  onClose: () => void
}

/** A short note on one item ("Perfect for Sunday night"). Mounted only while open. */
export default function NoteDialog({ item, onSave, onClose }: NoteDialogProps) {
  const { t } = useTranslation(['lists', 'common'])
  const [note, setNote] = useState(item.note)
  const tooLong = note.trim().length > LIST_NOTE_MAX
  const formId = `note-${item.key}`

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (tooLong) return
    onSave(note.trim())
    onClose()
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={t(item.note ? 'items.editNote' : 'items.addNote')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" form={formId} variant="primary" disabled={tooLong}>
            {t('note.save')}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} noValidate>
        <Textarea
          label={t('note.label', { title: item.title })}
          value={note}
          onChange={setNote}
          maxLength={LIST_NOTE_MAX}
          error={tooLong ? t('note.tooLong', { max: LIST_NOTE_MAX }) : null}
          rows={3}
          placeholder={t('note.placeholder')}
          autoFocus
        />
      </form>
    </Dialog>
  )
}
