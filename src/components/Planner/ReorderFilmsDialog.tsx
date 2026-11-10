import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { PlanSession } from '../../types/plan'
import Banner from '../../shared/ui/Banner/Banner'
import Button from '../../shared/ui/Button/Button'
import Dialog from '../../shared/ui/Dialog/Dialog'
import SortableList from '../../shared/ui/SortableList/SortableList'
import { FilmCells, SlotCell } from './PreviewSchedule'
import styles from './Planner.module.css'

interface ReorderFilmsDialogProps {
  /** The pending sessions of the marathon, by date: the evenings that are still ahead. */
  sessions: PlanSession[]
  /** The ids of those sessions in the new film order. */
  onSave: (order: string[]) => Promise<void>
  onClose: () => void
}

/** Drag the films of a marathon between its remaining evenings; the dates stay. */
export default function ReorderFilmsDialog({ sessions, onSave, onClose }: ReorderFilmsDialogProps) {
  const { t } = useTranslation(['planner', 'common'])
  const [order, setOrder] = useState(() => sessions.map((s) => s.id))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const byId = new Map(sessions.map((s) => [s.id, s]))
  const changed = order.some((id, i) => id !== sessions[i]?.id)

  // Row i keeps the date of the i-th evening and shows whichever film is there now.
  const rows = order.flatMap((id, i) => {
    const slot = sessions[i]
    const film = byId.get(id)
    return slot && film ? [{ id, slot, film }] : []
  })
  const title = (row: (typeof rows)[number]) => row.film.units[0]?.title

  function move(movedId: string, overId: string) {
    const next = [...order]
    const from = next.indexOf(movedId)
    const to = next.indexOf(overId)
    if (from === -1 || to === -1 || from === to) return
    const [id] = next.splice(from, 1)
    if (id) next.splice(to, 0, id)
    setOrder(next)
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      await onSave(order)
      onClose()
    } catch (e) {
      setSaving(false)
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <Dialog
      open
      onClose={() => !saving && onClose()}
      title={t('reorder.title')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            {t('common:actions.cancel')}
          </Button>
          <Button
            variant="primary"
            loading={saving}
            disabled={!changed}
            onClick={() => void save()}
          >
            {t('reorder.submit')}
          </Button>
        </>
      }
    >
      <p>{t('reorder.body')}</p>
      <SortableList
        items={rows}
        getId={(row) => row.id}
        onMove={move}
        label={t('preview.scheduleLabel')}
        className={styles.agendaList}
        rowClassName={styles.agendaRow}
        texts={{
          instructions: t('preview.reorder.instructions'),
          handle: (row) => t('preview.reorder.handle', { title: title(row) }),
          pickedUp: (row) => t('preview.reorder.pickedUp', { title: title(row) }),
          movedTo: (row, place) => t('preview.reorder.movedTo', { title: title(row), place }),
          dropped: (row, place) => t('preview.reorder.dropped', { title: title(row), place }),
          cancelled: (row) => t('preview.reorder.cancelled', { title: title(row) }),
        }}
        renderItem={(row, handle) => (
          <>
            {handle}
            <SlotCell session={row.slot} />
            <FilmCells session={row.film} />
          </>
        )}
      />
      {error && (
        <Banner tone="warning" icon="alert">
          {error}
        </Banner>
      )}
    </Dialog>
  )
}
