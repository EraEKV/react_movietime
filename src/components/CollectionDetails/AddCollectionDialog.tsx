import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { loadListsService, useListAuthor, useMyLists } from '../../hooks/useLists'
import type { CollectionFilm } from '../../utils/collection'
import { filmToListMedia } from '../../utils/collection'
import { listErrorMessage } from '../../utils/listErrors'
import { LIST_EMOJIS, titlesCount } from '../../utils/lists'
import Banner from '../../shared/ui/Banner/Banner'
import Button from '../../shared/ui/Button/Button'
import ButtonLink from '../../shared/ui/ButtonLink/ButtonLink'
import Dialog from '../../shared/ui/Dialog/Dialog'
import RadioCards, { type RadioCardOption } from '../../shared/ui/RadioCards/RadioCards'
import Skeleton from '../../shared/ui/Skeleton/Skeleton'
import styles from './CollectionDetails.module.css'

const NEW_LIST = '__new'
const NAME_MAX = 60

interface AddCollectionDialogProps {
  name: string
  films: CollectionFilm[]
  onClose: () => void
}

interface Result {
  message: string
  listId: string
}

/**
 * Puts every film of a collection into one of your lists, or into a new list named after it.
 * Films the list already has are skipped, so adding twice changes nothing.
 * Mounted only while open, so the lists are read fresh every time.
 */
export default function AddCollectionDialog({ name, films, onClose }: AddCollectionDialogProps) {
  const { t } = useTranslation(['collection', 'common'])
  const lists = useMyLists()
  const author = useListAuthor()
  const [choice, setChoice] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)

  const movies = (count: number) => t('common:count.movies', { count })
  const listName = name.slice(0, NAME_MAX)

  async function handleAdd() {
    if (!author || !choice) return
    setSaving(true)
    setError(null)
    try {
      const service = await loadListsService()
      const media = films.map(filmToListMedia)
      if (choice === NEW_LIST) {
        const id = await service.createList(author, {
          name: listName,
          description: '',
          emoji: LIST_EMOJIS[1] ?? LIST_EMOJIS[0] ?? '🎬',
        })
        await service.addMissingItems({ id, covers: [] }, media, author)
        setResult({
          listId: id,
          message: t('dialog.created', { list: listName, movies: movies(media.length) }),
        })
        return
      }
      const list = lists.status === 'success' ? lists.data.find((l) => l.id === choice) : undefined
      if (!list) return
      const { added, skipped } = await service.addMissingItems(list, media, author)
      let message = t('dialog.added', { list: list.name, movies: movies(added) })
      if (added === 0) message = t('dialog.alreadyAll', { list: list.name })
      else if (skipped > 0) {
        message = t('dialog.addedSome', { list: list.name, added, skipped })
      }
      setResult({ listId: list.id, message })
    } catch (e) {
      setError(listErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  let body
  if (result) {
    body = (
      <p role="status" className={styles.dialogMessage}>
        {result.message}
      </p>
    )
  } else if (lists.status === 'error') {
    body = (
      <Banner tone="warning" icon="alert">
        {t('dialog.loadError')}
      </Banner>
    )
  } else if (lists.status !== 'success') {
    body = (
      <div className={styles.dialogSkeleton} aria-busy="true" aria-label={t('dialog.loading')}>
        <Skeleton height={56} radius="md" />
        <Skeleton height={56} radius="md" />
      </div>
    )
  } else {
    const options: RadioCardOption<string>[] = [
      ...lists.data.map((list) => ({
        value: list.id,
        label: `${list.emoji} ${list.name}`,
        description: titlesCount(list.itemCount),
      })),
      { value: NEW_LIST, label: t('dialog.newList', { name: listName }), icon: 'plus' as const },
    ]
    body = (
      <>
        <p className={styles.dialogText}>
          {lists.data.length === 0
            ? t('dialog.noLists')
            : t('dialog.body', { movies: movies(films.length), name })}
        </p>
        <RadioCards
          legend={t('dialog.pick')}
          options={options}
          value={choice}
          onChange={setChoice}
          columns={1}
        />
      </>
    )
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={t('dialog.title')}
      footer={
        result ? (
          <>
            <ButtonLink to={`/lists/${result.listId}`} variant="ghost" icon="list">
              {t('dialog.open')}
            </ButtonLink>
            <Button variant="primary" onClick={onClose}>
              {t('dialog.done')}
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              {t('dialog.cancel')}
            </Button>
            <Button
              variant="primary"
              icon="plus"
              loading={saving}
              disabled={!choice || lists.status !== 'success'}
              onClick={() => void handleAdd()}
            >
              {t('dialog.add', { movies: movies(films.length) })}
            </Button>
          </>
        )
      }
    >
      {body}
      {error && (
        <Banner tone="warning" icon="alert">
          {error}
        </Banner>
      )}
    </Dialog>
  )
}
