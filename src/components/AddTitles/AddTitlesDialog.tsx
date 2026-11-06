import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { imageUrl } from '../../shared/api/tmdb'
import { useTitleSearch } from '../../hooks/useTitleSearch'
import type { ListMedia } from '../../types/list'
import type { MediaKey } from '../../types/media'
import { getYear } from '../../utils/format'
import { summaryToListMedia } from '../../utils/lists'
import { mediaKey } from '../../utils/media'
import Badge from '../Badge/Badge'
import Banner from '../Banner/Banner'
import Button from '../Button/Button'
import Checkbox from '../Checkbox/Checkbox'
import Dialog from '../Dialog/Dialog'
import Icon from '../Icon/Icon'
import Skeleton from '../Skeleton/Skeleton'
import TextField from '../TextField/TextField'
import styles from './AddTitles.module.css'

const MAX_RESULTS = 12

interface AddTitlesDialogProps {
  listName: string
  /** Titles already in the list: shown checked and disabled. */
  existing: ReadonlySet<MediaKey>
  /** Resolves when saved; a rejection keeps the dialog open with an error. */
  onAdd: (media: ListMedia[]) => Promise<void>
  onClose: () => void
}

/**
 * Search picker for movies and series. The page mounts it only while open, so every
 * opening starts with an empty search and nothing selected.
 */
export default function AddTitlesDialog({
  listName,
  existing,
  onAdd,
  onClose,
}: AddTitlesDialogProps) {
  const { t } = useTranslation(['sharing', 'common', 'library'])
  const [query, setQuery] = useState('')
  // Map keeps the order in which titles were picked; the key prevents picking one twice.
  const [picked, setPicked] = useState<Map<MediaKey, ListMedia>>(new Map())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const search = useTitleSearch(query)

  function toggle(key: MediaKey, media: ListMedia, on: boolean) {
    // A new Map: state is never mutated in place, or React wouldn't see the change.
    setPicked((current) => {
      const next = new Map(current)
      if (on) next.set(key, media)
      else next.delete(key)
      return next
    })
  }

  async function handleAdd() {
    setSaving(true)
    setError(null)
    try {
      await onAdd([...picked.values()])
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setSaving(false)
    }
  }

  let results
  if (search.tooShort) {
    results = (
      <p className={styles.hint}>
        <Icon name="search" size={18} />
        {t('add.tooShort')}
      </p>
    )
  } else if (search.pending || search.status === 'loading') {
    results = (
      <ul className={styles.results} aria-busy="true" aria-label={t('add.searching')}>
        {Array.from({ length: 4 }, (_, i) => (
          <li key={i} className={styles.skeletonRow}>
            <Skeleton width={32} height={48} radius="xs" />
            <Skeleton width="50%" height={16} />
          </li>
        ))}
      </ul>
    )
  } else if (search.status === 'error') {
    results = (
      <Banner
        tone="warning"
        action={
          <Button size="sm" onClick={search.reload}>
            {t('common:actions.tryAgain')}
          </Button>
        }
      >
        {t('add.failed', { message: search.error.message })}
      </Banner>
    )
  } else if (search.status === 'success' && search.data.length === 0) {
    results = <p className={styles.hint}>{t('add.nothing', { query: query.trim() })}</p>
  } else if (search.status === 'success') {
    results = (
      <ul className={styles.results} aria-label={t('add.results')}>
        {search.data.slice(0, MAX_RESULTS).map((item) => {
          const key = mediaKey(item.mediaType, item.id)
          const inList = existing.has(key)
          const checked = inList || picked.has(key)
          const poster = imageUrl(item.posterPath, 'w92')
          const year = getYear(item.date)
          return (
            <li key={key}>
              <Checkbox
                className={styles.row}
                checked={checked}
                disabled={inList}
                onChange={(on) => toggle(key, summaryToListMedia(item), on)}
                label={
                  <span className={styles.rowBody}>
                    <span className={styles.poster} aria-hidden="true">
                      {poster ? (
                        <img src={poster} alt="" loading="lazy" />
                      ) : (
                        <Icon name={item.mediaType === 'movie' ? 'film' : 'tv'} size={16} />
                      )}
                    </span>
                    <span className={styles.text}>
                      <strong>{item.title}</strong>
                      <span>
                        {[year, t(item.mediaType === 'movie' ? 'library:movie' : 'library:series')]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </span>
                    {inList && <Badge>{t('add.already')}</Badge>}
                  </span>
                }
              />
            </li>
          )
        })}
      </ul>
    )
  }

  const count = picked.size
  return (
    <Dialog
      open
      onClose={onClose}
      title={t('add.title', { name: listName })}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button
            variant="primary"
            icon="plus"
            disabled={count === 0}
            loading={saving}
            onClick={() => void handleAdd()}
          >
            {count === 0 ? t('add.submit') : t('add.submitCount', { count })}
          </Button>
        </>
      }
    >
      <TextField
        label={t('add.search')}
        hideLabel
        type="search"
        icon="search"
        value={query}
        onChange={setQuery}
        placeholder={t('add.search')}
        autoComplete="off"
        // The dialog's first focusable element is the close button; searching is the task.
        autoFocus
      />
      {results}
      {error && (
        <Banner tone="warning" icon="alert">
          {error}
        </Banner>
      )}
    </Dialog>
  )
}
