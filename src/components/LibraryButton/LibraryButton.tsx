import { useTranslation } from 'react-i18next'
import { useLibrary, useLibraryEntry } from '../../hooks/useLibrary'
import { useTimedState } from '../../hooks/useTimedState'
import type { LibraryMedia } from '../../types/library'
import { LIBRARY_STATUSES, statusLabel } from '../../utils/library'
import { mediaKey } from '../../utils/media'
import Button from '../Button/Button'
import { buttonClass } from '../Button/variants'
import Icon from '../Icon/Icon'
import Menu, { type MenuItem } from '../Menu/Menu'
import { STATUS_ICON } from '../StatusMarker/statusIcons'
import Toast from '../Toast/Toast'

const UNDO_MS = 6000

interface UndoToast {
  text: string
  undo: () => void
}

/**
 * Title page action: "Add to library" for a new title, otherwise a status menu
 * with Edit and Remove. Every change offers Undo in a toast.
 */
export default function LibraryButton({ media }: { media: LibraryMedia }) {
  const { t } = useTranslation('library')
  const key = mediaKey(media.mediaType, media.tmdbId)
  const entry = useLibraryEntry(key)
  const { status, add, update, remove, restore } = useLibrary()
  const [toast, showToast, hideToast] = useTimedState<UndoToast>(UNDO_MS)

  function handleUndo() {
    toast?.undo()
    hideToast()
  }

  let control
  if (status === 'loading') {
    // Until the account library arrives we can't know if the title is in it,
    // and "Add" would overwrite an existing entry's score and notes.
    control = (
      <Button icon="bookmark" loading disabled>
        {t('button.loading')}
      </Button>
    )
  } else if (!entry) {
    control = (
      <Button
        variant="primary"
        icon="plus"
        onClick={() => {
          void add(media, 'plan')
          showToast({ text: t('button.added'), undo: () => void remove(key) })
        }}
      >
        {t('button.add')}
      </Button>
    )
  } else {
    const previous = entry.status
    const items: MenuItem[] = [
      ...LIBRARY_STATUSES.map((option) => ({
        label: option.label,
        icon: STATUS_ICON[option.value],
        checked: option.value === entry.status,
        onSelect: () => {
          if (option.value === previous) return
          void update(key, { status: option.value })
          showToast({
            text: t('button.movedTo', { status: option.label }),
            undo: () => void update(key, { status: previous }),
          })
        },
      })),
      { kind: 'divider' },
      { label: t('button.edit'), icon: 'edit', to: `/library/${key}/edit` },
      {
        label: t('button.remove'),
        icon: 'trash',
        danger: true,
        onSelect: () => {
          void remove(key).then((removed) => {
            if (removed) {
              showToast({ text: t('button.removed'), undo: () => void restore(removed) })
            }
          })
        },
      },
    ]
    control = (
      <Menu
        label={t('button.status', { status: statusLabel(entry.status) })}
        triggerClassName={buttonClass('secondary', 'md')}
        trigger={
          <>
            <Icon name={STATUS_ICON[entry.status]} size={18} />
            {statusLabel(entry.status)}
            <Icon name="chevron-down" size={16} />
          </>
        }
        items={items}
      />
    )
  }

  return (
    <>
      {control}
      {toast && (
        <Toast icon="check" actionLabel="Undo" actionIcon="undo" onAction={handleUndo}>
          {toast.text}
        </Toast>
      )}
    </>
  )
}
