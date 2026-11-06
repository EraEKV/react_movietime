import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { loadListsService, useListAuthor, useMyLists } from '../../hooks/useLists'
import { useRequest } from '../../hooks/useRequest'
import type { ListMedia, TitleList } from '../../types/list'
import { listErrorMessage } from '../../utils/listErrors'
import { coversAfterAdd, titlesCount } from '../../utils/lists'
import { mediaKey } from '../../utils/media'
import Banner from '../Banner/Banner'
import Button from '../Button/Button'
import ButtonLink from '../ButtonLink/ButtonLink'
import Checkbox from '../Checkbox/Checkbox'
import Dialog from '../Dialog/Dialog'
import Skeleton from '../Skeleton/Skeleton'
import styles from './AddToList.module.css'

interface AddToListDialogProps {
  media: ListMedia
  onClose: () => void
}

/**
 * Checkboxes for the user's lists: checked = the title is in that list. Each change is
 * written right away (no Save button), like the library status menu.
 * Mounted only while open, so membership is read fresh every time.
 */
export default function AddToListDialog({ media, onClose }: AddToListDialogProps) {
  const { t } = useTranslation('sharing')
  const lists = useMyLists()
  const author = useListAuthor()
  const key = mediaKey(media.mediaType, media.tmdbId)
  // Local changes on top of what the server said, so a click shows up immediately.
  const [changed, setChanged] = useState<Map<string, boolean>>(new Map())
  const [error, setError] = useState<string | null>(null)

  const ids = lists.status === 'success' ? lists.data.map((l) => l.id) : null
  // One read per list: is this title in it? Re-runs only when the set of lists changes.
  const membership = useRequest(ids && `${key}:${ids.join(',')}`, async () =>
    (await loadListsService()).listsContaining(ids ?? [], key),
  )

  const isIn = (list: TitleList) =>
    changed.get(list.id) ?? (membership.status === 'success' && membership.data.has(list.id))

  function toggle(list: TitleList, on: boolean) {
    if (!author) return
    setError(null)
    setChanged((current) => new Map(current).set(list.id, on))
    void loadListsService().then((service) => {
      const write = on
        ? service.addItems(list.id, [media], author, coversAfterAdd(list.covers, [media]))
        : service.removeItem(
            list.id,
            key,
            list.covers.filter((path) => path !== media.posterPath),
          )
      write.catch((e: unknown) => {
        // Roll the checkbox back and say why.
        setChanged((current) => new Map(current).set(list.id, !on))
        setError(listErrorMessage(e))
      })
    })
  }

  let body
  if (lists.status === 'error' || membership.status === 'error') {
    body = (
      <Banner tone="warning" icon="alert">
        {t('addTo.loadError')}
      </Banner>
    )
  } else if (lists.status === 'success' && lists.data.length === 0) {
    body = <p className={styles.empty}>{t('addTo.empty', { title: media.title })}</p>
  } else if (lists.status !== 'success' || membership.status !== 'success') {
    body = (
      <ul className={styles.lists} aria-busy="true" aria-label={t('addTo.loading')}>
        {Array.from({ length: 3 }, (_, i) => (
          <li key={i} className={styles.skeleton}>
            <Skeleton width={20} height={20} radius="xs" />
            <Skeleton width="55%" height={16} />
          </li>
        ))}
      </ul>
    )
  } else {
    body = (
      <ul className={styles.lists} aria-label={t('addTo.yourLists')}>
        {lists.data.map((list) => (
          <li key={list.id}>
            <Checkbox
              className={styles.row}
              checked={isIn(list)}
              onChange={(on) => toggle(list, on)}
              label={
                <span className={styles.rowBody}>
                  <span className={styles.emoji} aria-hidden="true">
                    {list.emoji}
                  </span>
                  <span className={styles.text}>
                    <strong>{list.name}</strong>
                    <span>{titlesCount(list.itemCount)}</span>
                  </span>
                </span>
              }
            />
          </li>
        ))}
      </ul>
    )
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={t('addTo.title', { title: media.title })}
      footer={
        <>
          <ButtonLink to="/lists/new" variant="ghost" icon="plus">
            {t('addTo.new')}
          </ButtonLink>
          <Button variant="primary" onClick={onClose}>
            {t('share.done')}
          </Button>
        </>
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
