import { useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import AddTitlesDialog from '../components/AddTitles/AddTitlesDialog'
import { RoleBadge, VisibilityBadge } from '../components/Badge/ListBadges'
import Banner from '../components/Banner/Banner'
import Button from '../components/Button/Button'
import { buttonClass } from '../components/Button/variants'
import Dialog from '../components/Dialog/Dialog'
import EmptyState from '../components/EmptyState/EmptyState'
import ErrorState from '../components/EmptyState/ErrorState'
import Icon from '../components/Icon/Icon'
import ListItems from '../components/ListItems/ListItems'
import NoteDialog from '../components/ListItems/NoteDialog'
import Menu from '../components/Menu/Menu'
import SegmentedControl from '../components/SegmentedControl/SegmentedControl'
import Skeleton from '../components/Skeleton/Skeleton'
import SkeletonGrid from '../components/Skeleton/SkeletonGrid'
import Toast from '../components/Toast/Toast'
import { loadListsService, useList, useListAuthor } from '../hooks/useLists'
import { useTimedState } from '../hooks/useTimedState'
import type { ListItem, ListMedia, TitleList } from '../types/list'
import { listErrorMessage, OFFLINE_MESSAGE } from '../utils/listErrors'
import { noticeFromState } from '../utils/notice'
import { canEditItems, coversAfterAdd, coversOf, titlesCount } from '../utils/lists'
import NotFoundPage from './NotFoundPage'
import styles from './ListPage.module.css'

const TOAST_MS = 6000

interface Notice {
  text: string
  undo?: () => void
}

export default function ListPage() {
  const { id = '' } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const state = useList(id)
  const author = useListAuthor()

  const [view, setView] = useState<'grid' | 'rows'>('grid')
  const [picking, setPicking] = useState(false)
  const [noteFor, setNoteFor] = useState<ListItem | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const passedNotice = noticeFromState(location.state)
  const [toast, showToast, hideToast] = useTimedState<Notice>(
    TOAST_MS,
    passedNotice ? { text: passedNotice } : null,
  )

  const items = state.status === 'ready' ? state.items : null
  // A Set for "Already in list" lookups in the picker: O(1) per search result.
  const existing = useMemo(() => new Set(items?.map((item) => item.key)), [items])

  // Deleting removes the list locally first, so the snapshot says "missing" before the
  // batch finishes; keep the skeleton up instead of flashing "not found".
  if (state.status === 'loading' || (deleting && state.status === 'missing')) {
    return <ListPageSkeleton />
  }

  if (state.status === 'missing') {
    return (
      <NotFoundPage
        title="This list doesn’t exist"
        text="It may have been deleted, or the link is wrong. Private lists open only for their owner and members."
        secondary={{ to: '/lists', label: 'Go to lists', icon: 'list' }}
      />
    )
  }

  if (state.status === 'error') {
    return (
      <section className={styles.page}>
        <ErrorState
          title="We couldn’t load this list"
          body={state.error.message}
          onRetry={state.retry}
        />
      </section>
    )
  }

  const { list, role } = state
  const editable = canEditItems(role)

  /** Item writes aren't awaited: the snapshot shows them at once; failures come back here. */
  const reportFailure = (error: unknown) => showToast({ text: listErrorMessage(error) })

  async function handleAdd(added: ListMedia[]) {
    if (!author) return
    if (!navigator.onLine) throw new Error(OFFLINE_MESSAGE)
    const service = await loadListsService()
    try {
      await service.addItems(list.id, added, author, coversAfterAdd(list.covers, added))
    } catch (error) {
      throw new Error(listErrorMessage(error), { cause: error })
    }
    showToast({ text: `Added ${titlesCount(added.length)}` })
  }

  function handleRemove(item: ListItem) {
    const rest = (items ?? []).filter((i) => i.key !== item.key)
    void loadListsService().then((service) => {
      service.removeItem(list.id, item.key, coversOf(rest)).catch(reportFailure)
      showToast({
        text: `Removed “${item.title}”`,
        undo: () =>
          void service.restoreItem(list.id, item, coversOf([...rest, item])).catch(reportFailure),
      })
    })
  }

  function handleNote(item: ListItem, note: string) {
    if (note === item.note) return
    void loadListsService().then((service) =>
      service
        .updateItemNote(list.id, item.key, note)
        .then(() => showToast({ text: note ? 'Note saved' : 'Note removed' }))
        .catch(reportFailure),
    )
  }

  async function handleDelete() {
    if (!navigator.onLine) return setDeleteError(OFFLINE_MESSAGE)
    setDeleting(true)
    setDeleteError(null)
    try {
      await (await loadListsService()).deleteList(list.id)
      navigate('/lists', { replace: true, state: { notice: `Deleted “${list.name}”` } })
    } catch (error) {
      setDeleting(false)
      setDeleteError(listErrorMessage(error))
    }
  }

  let body
  if (state.itemsError) {
    body = (
      <ErrorState
        title="We couldn’t load the titles"
        body={state.itemsError.message}
        onRetry={state.retry}
        headingLevel="h3"
      />
    )
  } else if (!items) {
    body = <SkeletonGrid count={6} label="Loading titles" />
  } else if (items.length === 0) {
    body = editable ? (
      <EmptyState
        icon="plus"
        title="Add the first title"
        body="Search movies and series and pick as many as you like. Each can carry a short note."
        headingLevel="h3"
        actions={
          <Button variant="primary" icon="plus" onClick={() => setPicking(true)}>
            Add titles
          </Button>
        }
      />
    ) : (
      <EmptyState
        icon="list"
        title="This list is empty"
        body="Titles appear here when the owner or an editor adds them."
        headingLevel="h3"
      />
    )
  } else {
    body = (
      <ListItems
        items={items}
        view={view}
        editable={editable}
        onEditNote={setNoteFor}
        onRemove={handleRemove}
      />
    )
  }

  return (
    <article className={styles.page} aria-labelledby="list-title">
      <title>{`${list.name} · Movietime`}</title>

      {role === 'viewer' && (
        <Banner>
          You can view this list. Ask {list.ownerName} for editor access to add titles.
        </Banner>
      )}
      {role === 'link' && (
        <Banner>You’re viewing a shared link. Only the owner and editors can change it.</Banner>
      )}

      <header className={styles.header}>
        <span className={styles.emoji} aria-hidden="true">
          {list.emoji}
        </span>
        <div className={styles.heading}>
          <h1 id="list-title" className={styles.title}>
            {list.name}
          </h1>
          {list.description && <p className={styles.description}>{list.description}</p>}
          <div className={styles.meta}>
            <RoleBadge role={role} />
            <VisibilityBadge visibility={list.visibility} members={list.memberEmails.length} />
            {role !== 'owner' && <span>by {list.ownerName}</span>}
          </div>
        </div>
        {editable && (
          <div className={styles.actions}>
            <Button variant="primary" icon="plus" onClick={() => setPicking(true)}>
              Add titles
            </Button>
            {role === 'owner' && <OwnerMenu list={list} onDelete={() => setConfirmDelete(true)} />}
          </div>
        )}
      </header>

      <section aria-labelledby="list-items-title" className={styles.items}>
        <div className={styles.toolbar}>
          <h2 id="list-items-title" className={styles.count}>
            {items ? titlesCount(items.length) : titlesCount(list.itemCount)}
          </h2>
          {items && items.length > 0 && (
            <SegmentedControl
              label="View"
              value={view}
              onChange={setView}
              options={[
                { value: 'grid', label: 'Grid', icon: 'grid', hideLabel: true },
                { value: 'rows', label: 'Rows', icon: 'rows', hideLabel: true },
              ]}
            />
          )}
        </div>
        {body}
      </section>

      {/* Mounted only while open, so each opening starts fresh. */}
      {picking && (
        <AddTitlesDialog
          listName={list.name}
          existing={existing}
          onAdd={handleAdd}
          onClose={() => setPicking(false)}
        />
      )}
      {noteFor && (
        <NoteDialog
          item={noteFor}
          onSave={(note) => handleNote(noteFor, note)}
          onClose={() => setNoteFor(null)}
        />
      )}

      <Dialog
        open={confirmDelete}
        onClose={() => !deleting && setConfirmDelete(false)}
        title={`Delete “${list.name}”?`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="danger-solid"
              icon="trash"
              loading={deleting}
              onClick={() => void handleDelete()}
            >
              Delete list
            </Button>
          </>
        }
      >
        <p>
          The list and its {titlesCount(list.itemCount)} will be deleted. Your library isn’t
          affected.
        </p>
        {deleteError && (
          <Banner tone="warning" icon="alert">
            {deleteError}
          </Banner>
        )}
      </Dialog>

      {toast && (
        <Toast
          icon={toast.undo ? undefined : 'check'}
          actionLabel={toast.undo ? 'Undo' : undefined}
          onAction={() => {
            toast.undo?.()
            hideToast()
          }}
        >
          {toast.text}
        </Toast>
      )}
    </article>
  )
}

function OwnerMenu({ list, onDelete }: { list: TitleList; onDelete: () => void }) {
  return (
    <Menu
      label="More list actions"
      align="right"
      triggerClassName={buttonClass('secondary', 'md', { iconOnly: true })}
      trigger={<Icon name="more" size={20} />}
      items={[
        { label: 'Edit list', icon: 'edit', to: `/lists/${list.id}/edit` },
        { kind: 'divider' },
        { label: 'Delete list', icon: 'trash', danger: true, onSelect: onDelete },
      ]}
    />
  )
}

function ListPageSkeleton() {
  return (
    <section className={styles.page} aria-busy="true" aria-label="Loading list">
      <div className={styles.header}>
        <Skeleton width={56} height={56} radius="md" />
        <div className={styles.heading}>
          <Skeleton width="40%" height={36} />
          <Skeleton width="70%" height={16} />
          <Skeleton width={160} height={24} radius="xs" />
        </div>
      </div>
      <SkeletonGrid count={6} />
    </section>
  )
}
