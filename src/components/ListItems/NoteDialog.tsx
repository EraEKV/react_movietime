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
      title={item.note ? 'Edit note' : 'Add note'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId} variant="primary" disabled={tooLong}>
            Save note
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} noValidate>
        <Textarea
          label={`Note for “${item.title}”`}
          value={note}
          onChange={setNote}
          maxLength={LIST_NOTE_MAX}
          error={tooLong ? `Keep the note under ${LIST_NOTE_MAX} characters.` : null}
          rows={3}
          placeholder="Why is it on this list?"
          autoFocus
        />
      </form>
    </Dialog>
  )
}
