import i18n from '../shared/i18n'
import { useTranslation } from 'react-i18next'
import { useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import AddTitlesDialog from '../components/AddTitles/AddTitlesDialog'
import AvatarStack from '../shared/ui/AvatarStack/AvatarStack'
import { RoleBadge, VisibilityBadge } from '../components/ListCard/ListBadges'
import Banner from '../shared/ui/Banner/Banner'
import Button from '../shared/ui/Button/Button'
import { buttonClass } from '../shared/ui/Button/variants'
import ButtonLink from '../shared/ui/ButtonLink/ButtonLink'
import Dialog from '../shared/ui/Dialog/Dialog'
import EmptyState from '../shared/ui/EmptyState/EmptyState'
import ErrorState from '../shared/ui/EmptyState/ErrorState'
import Icon from '../shared/ui/Icon/Icon'
import ListItems from '../components/ListItems/ListItems'
import NoteDialog from '../components/ListItems/NoteDialog'
import Menu from '../shared/ui/Menu/Menu'
import MarathonCard from '../components/Planner/MarathonCard'
import SegmentedControl from '../shared/ui/SegmentedControl/SegmentedControl'
import ShareDialog from '../components/ShareDialog/ShareDialog'
import Skeleton from '../shared/ui/Skeleton/Skeleton'
import SkeletonGrid from '../components/PosterCard/SkeletonGrid'
import Toast from '../shared/ui/Toast/Toast'
import { useAuth } from '../hooks/useAuth'
import { loadListsService, useList, useListAuthor } from '../hooks/useLists'
import { useSharing } from '../hooks/useSharing'
import { useTimedState } from '../shared/hooks/useTimedState'
import type { ListItem, ListMedia, ListRole, TitleList } from '../types/list'
import { listErrorMessage, offlineMessage } from '../utils/listErrors'
import { noticeFromState } from '../shared/lib/notice'
import { canEditItems, coversAfterAdd, coversOf, titlesCount } from '../utils/lists'
import { loginPath } from '../shared/lib/redirect'
import { memberName, membersOf, roleLabel } from '../utils/sharing'
import type { MemberRole } from '../types/sharing'
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
  const { t } = useTranslation(['lists', 'common', 'library'])
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const state = useList(id)
  const author = useListAuthor()
  const sharing = useSharing(
    'lists',
    state.status === 'ready' ? state.list : null,
    state.status === 'ready' ? state.list.name : '',
  )

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
    const hint = !user ? t('page.hintGuest') : !user.emailVerified ? t('page.hintUnverified') : ''
    return (
      <NotFoundPage
        title={t('page.missingTitle')}
        text={`${t('page.missingBody')}${hint}`}
        secondary={
          user
            ? { to: '/lists', label: t('page.goLists'), icon: 'list' }
            : { to: loginPath(location.pathname), label: t('page.signIn'), icon: 'user' }
        }
      />
    )
  }

  if (state.status === 'error') {
    return (
      <section className={styles.page}>
        <ErrorState title={t('page.loadError')} body={state.error.message} onRetry={state.retry} />
      </section>
    )
  }

  const { list, role } = state
  const editable = canEditItems(role)

  /** Item writes aren't awaited: the snapshot shows them at once; failures come back here. */
  const reportFailure = (error: unknown) => showToast({ text: listErrorMessage(error) })

  async function handleAdd(added: ListMedia[]) {
    if (!author) return
    if (!navigator.onLine) throw new Error(offlineMessage())
    const service = await loadListsService()
    try {
      await service.addItems(list.id, added, author, coversAfterAdd(list.covers, added))
    } catch (error) {
      throw new Error(listErrorMessage(error), { cause: error })
    }
    showToast({ text: t('page.added', { titles: titlesCount(added.length) }) })
  }

  function handleRemove(item: ListItem) {
    const rest = (items ?? []).filter((i) => i.key !== item.key)
    void loadListsService().then((service) => {
      service.removeItem(list.id, item.key, coversOf(rest)).catch(reportFailure)
      showToast({
        text: t('page.removed', { title: item.title }),
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
        .then(() => showToast({ text: t(note ? 'page.noteSaved' : 'page.noteRemoved') }))
        .catch(reportFailure),
    )
  }

  async function handleDelete() {
    if (!navigator.onLine) return setDeleteError(offlineMessage())
    setDeleting(true)
    setDeleteError(null)
    try {
      await (await loadListsService()).deleteList(list.id)
      navigate('/lists', {
        replace: true,
        state: { notice: t('page.deleted', { name: list.name }) },
      })
    } catch (error) {
      setDeleting(false)
      setDeleteError(listErrorMessage(error))
    }
  }

  async function handleLeave() {
    if (!navigator.onLine) return setLeaveError(offlineMessage())
    setLeaving(true)
    setLeaveError(null)
    try {
      await sharing.leave()
      navigate('/lists', { replace: true, state: { notice: t('page.left', { name: list.name }) } })
    } catch (error) {
      setLeaving(false)
      setLeaveError(listErrorMessage(error))
    }
  }

  async function handleCopy() {
    if (!author) return
    if (!navigator.onLine) return showToast({ text: offlineMessage() })
    setCopying(true)
    try {
      const copyId = await (await loadListsService()).copyList(list, author)
      navigate(`/lists/${copyId}`, { state: { notice: t('page.copied', { name: list.name }) } })
    } catch (error) {
      setCopying(false)
      showToast({ text: listErrorMessage(error) })
    }
  }

  const movieCount = items?.filter((item) => item.mediaType === 'movie').length ?? 0

  // Members' names are shown to the people on the list; a link visitor sees only the owner.
  const members = role === 'link' ? [] : membersOf(list)
  const people = [list.ownerName, ...members.map((m) => memberName(m.email))]

  let actions
  if (role === 'owner') {
    actions = (
      <>
        <Button variant="primary" icon="plus" onClick={() => setPicking(true)}>
          {t('page.addTitles')}
        </Button>
        <Button icon="share" onClick={() => setShareOpen(true)}>
          {t('page.share')}
        </Button>
        <OwnerMenu list={list} onDelete={() => setConfirmDelete(true)} />
      </>
    )
  } else if (role === 'editor' || role === 'viewer') {
    actions = (
      <>
        {role === 'editor' && (
          <Button variant="primary" icon="plus" onClick={() => setPicking(true)}>
            {t('page.addTitles')}
          </Button>
        )}
        <MemberMenu onLeave={() => setConfirmLeave(true)} />
      </>
    )
  } else if (user) {
    actions = (
      <Button variant="primary" icon="copy" loading={copying} onClick={() => void handleCopy()}>
        {t('page.copy')}
      </Button>
    )
  } else {
    actions = (
      <ButtonLink to={loginPath(location.pathname)} variant="primary" icon="copy">
        {t('page.signInToCopy')}
      </ButtonLink>
    )
  }

  let body
  if (state.itemsError) {
    body = (
      <ErrorState
        title={t('page.itemsError')}
        body={state.itemsError.message}
        onRetry={state.retry}
        headingLevel="h3"
      />
    )
  } else if (!items) {
    body = <SkeletonGrid count={6} />
  } else if (items.length === 0) {
    body = editable ? (
      <EmptyState
        icon="plus"
        title={t('page.emptyAddTitle')}
        body={t('page.emptyAddBody')}
        headingLevel="h3"
        actions={
          <Button variant="primary" icon="plus" onClick={() => setPicking(true)}>
            {t('page.addTitles')}
          </Button>
        }
      />
    ) : (
      <EmptyState
        icon="list"
        title={t('page.emptyTitle')}
        body={t('page.emptyBody')}
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
      <title>{t('page.pageTitle', { title: list.name })}</title>

      {role === 'viewer' && <Banner>{t('page.viewerBanner', { owner: list.ownerName })}</Banner>}
      {role === 'link' && (
        <Banner>{user ? t('page.linkBannerUser') : t('page.linkBannerGuest')}</Banner>
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

      {/* Members can plan the list's movies; the plan is theirs, the list stays as it is. */}
      {user && role !== 'link' && movieCount > 0 && (
        <MarathonCard listId={list.id} movies={movieCount} />
      )}

      <section aria-labelledby="list-items-title" className={styles.items}>
        <div className={styles.toolbar}>
          <h2 id="list-items-title" className={styles.count}>
            {items ? titlesCount(items.length) : titlesCount(list.itemCount)}
          </h2>
          {items && items.length > 0 && (
            <SegmentedControl
              label={t('page.view')}
              value={view}
              onChange={setView}
              options={[
                { value: 'grid', label: t('page.grid'), icon: 'grid', hideLabel: true },
                { value: 'rows', label: t('page.rows'), icon: 'rows', hideLabel: true },
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
        title={t('page.deleteTitle', { name: list.name })}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)} disabled={deleting}>
              {t('common:actions.cancel')}
            </Button>
            <Button
              variant="danger-solid"
              icon="trash"
              loading={deleting}
              onClick={() => void handleDelete()}
            >
              {t('page.deleteConfirm')}
            </Button>
          </>
        }
      >
        <p>{t('page.deleteBody', { titles: titlesCount(list.itemCount) })}</p>
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
          inviteLink={sharing.inviteLink}
          onSendInvite={sharing.sendInviteEmail}
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
        title={t('page.leaveTitle', { name: list.name })}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmLeave(false)} disabled={leaving}>
              {t('common:actions.cancel')}
            </Button>
            <Button
              variant="danger-solid"
              icon="logout"
              loading={leaving}
              onClick={() => void handleLeave()}
            >
              {t('page.leaveConfirm')}
            </Button>
          </>
        }
      >
        <p>{t('page.leaveBody', { owner: list.ownerName })}</p>
        {leaveError && (
          <Banner tone="warning" icon="alert">
            {leaveError}
          </Banner>
        )}
      </Dialog>

      {toast && (
        <Toast
          icon={toast.undo ? undefined : 'check'}
          actionLabel={toast.undo ? t('common:actions.undo') : undefined}
          actionIcon="undo"
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
  const { t } = useTranslation('lists')
  return (
    <Menu
      label={t('page.moreActions')}
      align="right"
      triggerClassName={buttonClass('secondary', 'md', { iconOnly: true })}
      trigger={<Icon name="more" size={20} />}
      items={[
        { label: t('page.editList'), icon: 'edit', to: `/lists/${list.id}/edit` },
        { kind: 'divider' },
        { label: t('page.deleteConfirm'), icon: 'trash', danger: true, onSelect: onDelete },
      ]}
    />
  )
}

function MemberMenu({ onLeave }: { onLeave: () => void }) {
  const { t } = useTranslation('lists')
  return (
    <Menu
      label={t('page.moreActions')}
      align="right"
      triggerClassName={buttonClass('secondary', 'md', { iconOnly: true })}
      trigger={<Icon name="more" size={20} />}
      items={[{ label: t('page.leaveConfirm'), icon: 'logout', danger: true, onSelect: onLeave }]}
    />
  )
}

/** "Owner: Erasyl · dana (editor) · timur (viewer)", or just "by Erasyl" for a link visitor. */
function peopleLine(
  ownerName: string,
  members: { email: string; role: MemberRole }[],
  role: ListRole,
): string {
  if (role === 'link') return i18n.t('lists:page.byOwner', { owner: ownerName })
  const shown = members.slice(0, 3).map((m) =>
    i18n.t('lists:page.memberRole', {
      name: memberName(m.email),
      role: roleLabel(m.role).toLowerCase(),
    }),
  )
  const more = members.length - shown.length
  return [
    i18n.t('lists:page.owner', { owner: ownerName }),
    ...shown,
    ...(more > 0 ? [i18n.t('lists:page.more', { count: more })] : []),
  ].join(' · ')
}

function ListPageSkeleton() {
  const { t } = useTranslation('lists')
  return (
    <section className={styles.page} aria-busy="true" aria-label={t('page.loading')}>
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
