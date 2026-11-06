import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { imageUrl } from '../api/tmdb'
import Button from '../components/Button/Button'
import ButtonLink from '../components/ButtonLink/ButtonLink'
import Dialog from '../components/Dialog/Dialog'
import EmptyState from '../components/EmptyState/EmptyState'
import Icon from '../components/Icon/Icon'
import LibraryEntryForm from '../components/LibraryEntryForm/LibraryEntryForm'
import LibrarySkeleton from '../components/Library/LibrarySkeleton'
import { useLibrary, useLibraryEntry } from '../hooks/useLibrary'
import type { MediaKey } from '../types/media'
import { mediaKey, parseMediaKey } from '../utils/media'
import styles from './LibraryEditPage.module.css'

export default function LibraryEditPage() {
  const { t } = useTranslation(['library', 'common'])
  const { mediaKey: param = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const parsed = parseMediaKey(param)
  const key: MediaKey | null = parsed ? mediaKey(parsed.mediaType, parsed.id) : null
  const entry = useLibraryEntry(key)
  const { status, update, remove } = useLibrary()
  const [confirmOpen, setConfirmOpen] = useState(false)

  // Back to where the user came from (title page or library), or to the library on a direct link.
  const goBack = () => (location.key !== 'default' ? navigate(-1) : navigate('/library'))

  if (key && status === 'loading') {
    return (
      <section className={styles.page}>
        <LibrarySkeleton rows={1} />
      </section>
    )
  }

  if (!key || !entry) {
    return (
      <section className={styles.page}>
        <EmptyState
          icon="bookmark"
          title={t('edit.missingTitle')}
          body={t('edit.missingBody')}
          actions={
            <ButtonLink to="/library" variant="primary" icon="bookmark">
              {t('edit.goLibrary')}
            </ButtonLink>
          }
        />
      </section>
    )
  }

  const poster = imageUrl(entry.posterPath, 'w185')
  const entryKey = entry.key

  return (
    <section className={styles.page} aria-labelledby="edit-title">
      <title>{t('edit.pageTitle', { title: entry.title })}</title>

      <Button variant="ghost" icon="chevron-left" className={styles.back} onClick={goBack}>
        {t('common:actions.back')}
      </Button>

      <header className={styles.header}>
        <div className={styles.poster} aria-hidden="true">
          {poster ? (
            <img src={poster} alt="" />
          ) : (
            <Icon name={entry.mediaType === 'movie' ? 'film' : 'tv'} size={24} />
          )}
        </div>
        <div>
          <h1 id="edit-title" className={styles.title}>
            {entry.title}
          </h1>
          <p className={styles.meta}>
            {[t(entry.mediaType === 'movie' ? 'movie' : 'series'), entry.year]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
      </header>

      <LibraryEntryForm
        key={entryKey}
        entry={entry}
        onSave={(changes) => {
          void update(entryKey, changes)
          goBack()
        }}
        onCancel={goBack}
        onRemove={() => setConfirmOpen(true)}
      />

      {/* A destructive action that loses score, notes and progress: confirm first. */}
      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={t('edit.confirmTitle', { title: entry.title })}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button
              variant="danger-solid"
              icon="trash"
              onClick={() => {
                void remove(entryKey)
                navigate('/library', { replace: true })
              }}
            >
              {t('edit.remove')}
            </Button>
          </>
        }
      >
        <p>{t('edit.confirmBody')}</p>
      </Dialog>
    </section>
  )
}
