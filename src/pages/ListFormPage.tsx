import { useTranslation } from 'react-i18next'
import { useState, type ReactNode } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import Button from '../components/Button/Button'
import ButtonLink from '../components/ButtonLink/ButtonLink'
import ErrorState from '../components/EmptyState/ErrorState'
import ListForm from '../components/ListForm/ListForm'
import Skeleton from '../components/Skeleton/Skeleton'
import { loadListsService, useList, useListAuthor } from '../hooks/useLists'
import type { ListDraft } from '../types/list'
import { listErrorMessage, offlineMessage } from '../utils/listErrors'
import { EMPTY_DRAFT } from '../utils/lists'
import styles from './ListFormPage.module.css'

/** /lists/new and /lists/:id/edit: the route decides which one by the presence of :id. */
export default function ListFormPage() {
  const { id } = useParams()
  return id ? <EditList id={id} /> : <NewList />
}

function useGoBack(fallback: string) {
  const navigate = useNavigate()
  const location = useLocation()
  return () => (location.key !== 'default' ? navigate(-1) : navigate(fallback))
}

/** Shared save flow: saving flag, error text, and an offline check before writing. */
function useSave(save: (draft: ListDraft) => Promise<void>) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(draft: ListDraft) {
    if (!navigator.onLine) return setError(offlineMessage())
    setSaving(true)
    setError(null)
    try {
      await save(draft)
    } catch (e) {
      setError(listErrorMessage(e))
      setSaving(false)
    }
  }
  return { saving, error, submit }
}

function NewList() {
  const { t } = useTranslation('lists')
  const navigate = useNavigate()
  const author = useListAuthor()
  const goBack = useGoBack('/lists')
  const { saving, error, submit } = useSave(async (draft) => {
    if (!author) return
    const id = await (await loadListsService()).createList(author, draft)
    // The next page reads the notice from history state and shows a toast.
    navigate(`/lists/${id}`, { replace: true, state: { notice: t('form.created') } })
  })

  return (
    <FormShell title={t('form.newTitle')} onBack={goBack}>
      <ListForm
        initial={EMPTY_DRAFT}
        submitLabel={t('form.create')}
        saving={saving}
        error={error}
        onSubmit={(draft) => void submit(draft)}
        onCancel={goBack}
      />
    </FormShell>
  )
}

function EditList({ id }: { id: string }) {
  const { t } = useTranslation('lists')
  const navigate = useNavigate()
  const state = useList(id)
  const goBack = useGoBack(`/lists/${id}`)
  const { saving, error, submit } = useSave(async (draft) => {
    await (await loadListsService()).updateList(id, draft)
    navigate(`/lists/${id}`, { replace: true, state: { notice: t('form.saved') } })
  })

  if (state.status === 'loading') {
    return (
      <FormShell title={t('form.editTitle')} onBack={goBack}>
        <div className={styles.skeleton} aria-busy="true" aria-label={t('form.loading')}>
          <Skeleton height={100} radius="md" />
          <Skeleton height={72} radius="md" />
          <Skeleton height={120} radius="md" />
        </div>
      </FormShell>
    )
  }

  if (state.status === 'error') {
    return (
      <FormShell title={t('form.editTitle')} onBack={goBack}>
        <ErrorState title={t('form.loadError')} body={state.error.message} onRetry={state.retry} />
      </FormShell>
    )
  }

  // Only the owner edits name and description (rules enforce the same).
  if (state.status === 'missing' || state.role !== 'owner') {
    return (
      <FormShell title={t('form.editTitle')} onBack={goBack}>
        <ErrorState
          icon="list"
          title={t('form.cantEdit')}
          body={t('form.cantEditBody')}
          secondary={
            <ButtonLink to="/lists" variant="primary" icon="list">
              {t('form.goLists')}
            </ButtonLink>
          }
        />
      </FormShell>
    )
  }

  const { list } = state
  return (
    <FormShell title={t('form.editTitle')} onBack={goBack}>
      <ListForm
        // A fresh form per list; later snapshots of the same list don't reset what you typed.
        key={list.id}
        initial={{ name: list.name, description: list.description, emoji: list.emoji }}
        submitLabel="Save"
        saving={saving}
        error={error}
        onSubmit={(draft) => void submit(draft)}
        onCancel={goBack}
      />
    </FormShell>
  )
}

function FormShell({
  title,
  onBack,
  children,
}: {
  title: string
  onBack: () => void
  children: ReactNode
}) {
  const { t } = useTranslation(['lists', 'common'])
  return (
    <section className={styles.page} aria-labelledby="list-form-title">
      <title>{t('form.pageTitle', { title })}</title>
      <Button variant="ghost" icon="chevron-left" className={styles.back} onClick={onBack}>
        {t('common:actions.back')}
      </Button>
      <h1 id="list-form-title" className={styles.title}>
        {title}
      </h1>
      {children}
    </section>
  )
}
