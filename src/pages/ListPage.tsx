import { useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import AddTitlesDialog from '../components/AddTitles/AddTitlesDialog'
import AvatarStack from '../components/AvatarStack/AvatarStack'
import { RoleBadge, VisibilityBadge } from '../components/Badge/ListBadges'
import Banner from '../components/Banner/Banner'
import Button from '../components/Button/Button'
import { buttonClass } from '../components/Button/variants'
import ButtonLink from '../components/ButtonLink/ButtonLink'
import Dialog from '../components/Dialog/Dialog'
import EmptyState from '../components/EmptyState/EmptyState'
import ErrorState from '../components/EmptyState/ErrorState'
import Icon from '../components/Icon/Icon'
import ListItems from '../components/ListItems/ListItems'
import NoteDialog from '../components/ListItems/NoteDialog'
import Menu from '../components/Menu/Menu'
import SegmentedControl from '../components/SegmentedControl/SegmentedControl'
import ShareDialog from '../components/ShareDialog/ShareDialog'
import Skeleton from '../components/Skeleton/Skeleton'
import SkeletonGrid from '../components/Skeleton/SkeletonGrid'
import Toast from '../components/Toast/Toast'
import { useAuth } from '../hooks/useAuth'
import { loadListsService, useList, useListAuthor } from '../hooks/useLists'
import { useSharing } from '../hooks/useSharing'
import { useTimedState } from '../hooks/useTimedState'
import type { ListItem, ListMedia, ListRole, TitleList } from '../types/list'
import { listErrorMessage, OFFLINE_MESSAGE } from '../utils/listErrors'
import { noticeFromState } from '../utils/notice'
import { canEditItems, coversAfterAdd, coversOf, titlesCount } from '../utils/lists'
import { loginPath } from '../utils/redirect'
import { memberName, membersOf, ROLE_LABELS } from '../utils/sharing'
import NotFoundPage from './NotFoundPage'
import styles from './ListPage.module.css'

const TOAST_MS = 6000

interface Notice {
  text: string
  undo?: () => void
}

export default function ListPage() {
  const { id = '' } = useParams()
  // A key per list: "Copy to my lists" navigates to the new copy on the same route, and the
  // copy must start with fresh page state (and show the notice passed with it).
  return <ListView key={id} id={id} />
}

function ListView({ id }: { id: string }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const state = useList(id)
  const author = useListAuthor()
  const sharing = useSharing('lists', state.status === 'ready' ? state.list : null)

  const [view, setView] = useState<'grid' | 'rows'>('grid')
  const [picking, setPicking] = useState(false)
  const [noteFor, setNoteFor] = useState<ListItem | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [leaveError, setLeaveError] = useState<string | null>(null)
  const [copying, setCopying] = useState(false)
  const passedNotice = noticeFromState(location.state)
  const [toast, showToast, hideToast] = useTimedState<Notice>(
    TOAST_MS,
    passedNotice ? { text: passedNotice } : null,
  )

  const items = state.status === 'ready' ? state.items : null
  // A Set for "Already in list" lookups in the picker: O(1) per search result.
  const existing = useMemo(() => new Set(items?.map((item) => item.key)), [items])

  // Deleting (or leaving) changes the list locally first, so the snapshot says "missing"
  // before the write finishes; keep the skeleton up instead of flashing "not found".
  if (state.status === 'loading' || ((deleting || leaving) && state.status === 'missing')) {
    return <ListPageSkeleton />
  }

  if (state.status === 'missing') {
    // The same page for "deleted", "wrong link" and "no access": a stranger can't tell them
    // apart. The hint covers the two cases where the visitor can fix it themselves.
    const hint = !user
      ? ' If it was shared with you, sign in with the invited email.'
      : !user.emailVerified
        ? ' If it was shared with you, confirm your email first: shared access needs a verified address.'
        : ''
    return (
      <NotFoundPage
        title="This list doesn’t exist"
        text={`It may have been deleted, or the link is wrong. Private lists open only for their owner and members.${hint}`}
        secondary={
          user
            ? { to: '/lists', label: 'Go to lists', icon: 'list' }
            : { to: loginPath(location.pathname), label: 'Sign in', icon: 'user' }
        }
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

  async function handleLeave() {
    if (!navigator.onLine) return setLeaveError(OFFLINE_MESSAGE)
    setLeaving(true)
    setLeaveError(null)
    try {
      await sharing.leave()
      navigate('/lists', { replace: true, state: { notice: `You left “${list.name}”` } })
    } catch (error) {
      setLeaving(false)
      setLeaveError(listErrorMessage(error))
    }
  }

  async function handleCopy() {
    if (!author) return
    if (!navigator.onLine) return showToast({ text: OFFLINE_MESSAGE })
    setCopying(true)
    try {
      const copyId = await (await loadListsService()).copyList(list, author)
      navigate(`/lists/${copyId}`, { state: { notice: `Copied “${list.name}” to your lists` } })
    } catch (error) {
      setCopying(false)
      showToast({ text: listErrorMessage(error) })
    }
  }

  // Members' names are shown to the people on the list; a link visitor sees only the owner.
  const members = role === 'link' ? [] : membersOf(list)
  const people = [list.ownerName, ...members.map((m) => memberName(m.email))]

  let actions
  if (role === 'owner') {
    actions = (
      <>
        <Button variant="primary" icon="plus" onClick={() => setPicking(true)}>
          Add titles
        </Button>
        <Button icon="share" onClick={() => setShareOpen(true)}>
          Share
        </Button>
        <OwnerMenu list={list} onDelete={() => setConfirmDelete(true)} />
      </>
    )
  } else if (role === 'editor' || role === 'viewer') {
    actions = (
      <>
        {role === 'editor' && (
          <Button variant="primary" icon="plus" onClick={() => setPicking(true)}>
            Add titles
          </Button>
        )}
        <MemberMenu onLeave={() => setConfirmLeave(true)} />
      </>
    )
  } else if (user) {
    actions = (
      <Button variant="primary" icon="copy" loading={copying} onClick={() => void handleCopy()}>
        Copy to my lists
      </Button>
    )
  } else {
    actions = (
      <ButtonLink to={loginPath(location.pathname)} variant="primary" icon="copy">
        Sign in to copy
      </ButtonLink>
    )
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
        <Banner>
          {user
            ? 'You’re viewing a shared link. Copy it to your lists to make changes.'
            : 'You’re viewing a shared link. Sign in to copy it to your lists.'}
        </Banner>
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
            {people.length > 1 && <AvatarStack people={people} />}
            <span>{peopleLine(list.ownerName, members, role)}</span>
            <RoleBadge role={role} />
            {role === 'owner' && (
              <VisibilityBadge visibility={list.visibility} members={list.memberEmails.length} />
            )}
          </div>
        </div>
        <div className={styles.actions}>{actions}</div>
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

      {role === 'owner' && (
        <ShareDialog
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          name={list.name}
          url={sharing.url}
          owner={{
            name: author?.name ?? list.ownerName,
            email: user?.email ?? null,
            photoUrl: user?.photoURL ?? null,
          }}
          visibility={list.visibility}
          roles={list.roles}
          onVisibilityChange={sharing.setVisibility}
          onInvite={sharing.invite}
          onRoleChange={sharing.changeRole}
          onRemove={sharing.remove}
        />
      )}

      <Dialog
        open={confirmLeave}
        onClose={() => !leaving && setConfirmLeave(false)}
        title={`Leave “${list.name}”?`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmLeave(false)} disabled={leaving}>
              Cancel
            </Button>
            <Button
              variant="danger-solid"
              icon="logout"
              loading={leaving}
              onClick={() => void handleLeave()}
            >
              Leave list
            </Button>
          </>
        }
      >
        <p>
          You’ll lose access to this list. To come back, ask {list.ownerName} to invite you again.
        </p>
        {leaveError && (
          <Banner tone="warning" icon="alert">
            {leaveError}
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

function MemberMenu({ onLeave }: { onLeave: () => void }) {
  return (
    <Menu
      label="More list actions"
      align="right"
      triggerClassName={buttonClass('secondary', 'md', { iconOnly: true })}
      trigger={<Icon name="more" size={20} />}
      items={[{ label: 'Leave list', icon: 'logout', danger: true, onSelect: onLeave }]}
    />
  )
}

/** "Owner: Erasyl · dana (editor) · timur (viewer)", or just "by Erasyl" for a link visitor. */
function peopleLine(
  ownerName: string,
  members: { email: string; role: keyof typeof ROLE_LABELS }[],
  role: ListRole,
): string {
  if (role === 'link') return `by ${ownerName}`
  const shown = members
    .slice(0, 3)
    .map((m) => `${memberName(m.email)} (${ROLE_LABELS[m.role].toLowerCase()})`)
  const more = members.length - shown.length
  return [`Owner: ${ownerName}`, ...shown, ...(more > 0 ? [`${more} more`] : [])].join(' · ')
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
