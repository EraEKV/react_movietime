import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import Button from '../../shared/ui/Button/Button'
import IconButton from '../../shared/ui/IconButton/IconButton'
import TextField from '../../shared/ui/TextField/TextField'
import { planErrorMessage } from '../../utils/planner'
import styles from './PlanTitle.module.css'

interface PlanTitleProps {
  title: string
  /** Only the owner renames; everybody else just reads the name. */
  canRename: boolean
  /** Rejects with the reason when the change could not be saved. */
  onRename: (title: string) => Promise<void>
}

/** The plan's name as the page heading, with a pencil that turns it into an input. */
export default function PlanTitle({ title, canRename, onRename }: PlanTitleProps) {
  const { t } = useTranslation(['planner', 'common'])
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(title)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pencil = useRef<HTMLButtonElement>(null)

  const name = draft.trim()

  function start() {
    setDraft(title)
    setError(null)
    setEditing(true)
  }

  function stop() {
    setEditing(false)
    // Back to the pencil, so a keyboard user is not left on a button that has just gone.
    requestAnimationFrame(() => pencil.current?.focus())
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (name.length === 0) return setError(t('planner:new.nameRequired'))
    if (name === title) return stop()
    setSaving(true)
    setError(null)
    try {
      await onRename(name)
      setSaving(false)
      stop()
    } catch (reason) {
      setSaving(false)
      setError(planErrorMessage(reason))
    }
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape' && !saving) {
      event.stopPropagation()
      stop()
    }
  }

  return (
    <div className={styles.root}>
      {/* The page is labelled by this heading, so it stays in the tree while the input is open. */}
      <h1 id="plan-title" className={styles.title} hidden={editing}>
        {title}
      </h1>
      {canRename && !editing && (
        <IconButton
          ref={pencil}
          icon="edit"
          size="sm"
          label={t('planner:plan.rename')}
          onClick={start}
        />
      )}
      {editing && (
        <form className={styles.form} onSubmit={(event) => void save(event)} onKeyDown={onKeyDown}>
          <TextField
            label={t('planner:plan.nameLabel')}
            hideLabel
            value={draft}
            onChange={setDraft}
            maxLength={120}
            error={error}
            disabled={saving}
            autoFocus
          />
          <div className={styles.actions}>
            <Button type="submit" variant="primary" size="sm" icon="check" loading={saving}>
              {t('common:actions.save')}
            </Button>
            <Button variant="ghost" size="sm" disabled={saving} onClick={stop}>
              {t('common:actions.cancel')}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
