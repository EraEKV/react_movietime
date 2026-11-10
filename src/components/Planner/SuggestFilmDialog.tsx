import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { imageUrl } from '../../shared/api/tmdb'
import { useTitleSearch } from '../../hooks/useTitleSearch'
import type { MediaKey } from '../../types/media'
import { getYear } from '../../shared/lib/format'
import { mediaKey } from '../../utils/media'
import Badge from '../../shared/ui/Badge/Badge'
import Banner from '../../shared/ui/Banner/Banner'
import Button from '../../shared/ui/Button/Button'
import Dialog from '../../shared/ui/Dialog/Dialog'
import Icon from '../../shared/ui/Icon/Icon'
import Skeleton from '../../shared/ui/Skeleton/Skeleton'
import TextField from '../../shared/ui/TextField/TextField'
import addStyles from '../AddTitles/AddTitles.module.css'
import styles from './MarathonVotes.module.css'

const MAX_RESULTS = 12

interface SuggestFilmDialogProps {
  /** The caller words it: a suggestion, a replacement or a new film. */
  title: string
  body: string
  submitLabel: string
  /** Films already in the marathon: shown, but not pickable. */
  existing: ReadonlySet<MediaKey>
  /** Resolves when sent; a rejection keeps the dialog open with the error. */
  onSend: (tmdbId: number) => Promise<void>
  onClose: () => void
}

/** Search for one movie and hand it over: a suggestion, a replacement or a new film. */
export default function SuggestFilmDialog({
  title,
  body,
  submitLabel,
  existing,
  onSend,
  onClose,
}: SuggestFilmDialogProps) {
  const { t } = useTranslation(['planner', 'sharing', 'common', 'library'])
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const search = useTitleSearch(query)

  async function send() {
    if (picked === null) return
    setSaving(true)
    setError(null)
    try {
      await onSend(picked)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setSaving(false)
    }
  }

  let results
  if (search.tooShort) {
    results = (
      <p className={addStyles.hint}>
        <Icon name="search" size={18} />
        {t('sharing:add.tooShort')}
      </p>
    )
  } else if (search.pending || search.status === 'loading') {
    results = (
      <ul className={addStyles.results} aria-busy="true" aria-label={t('sharing:add.searching')}>
        {Array.from({ length: 4 }, (_, i) => (
          <li key={i} className={addStyles.skeletonRow}>
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
        {t('sharing:add.failed', { message: search.error.message })}
      </Banner>
    )
  } else if (search.status === 'success') {
    const movies = search.data.filter((item) => item.mediaType === 'movie').slice(0, MAX_RESULTS)
    results =
      movies.length === 0 ? (
        <p className={addStyles.hint}>{t('sharing:add.nothing', { query: query.trim() })}</p>
      ) : (
        <ul className={addStyles.results} aria-label={t('sharing:add.results')}>
          {movies.map((item) => {
            const inMarathon = existing.has(mediaKey('movie', item.id))
            const poster = imageUrl(item.posterPath, 'w92')
            const year = getYear(item.date)
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={styles.pick}
                  aria-pressed={picked === item.id}
                  disabled={inMarathon}
                  onClick={() => setPicked(item.id)}
                >
                  <span className={addStyles.rowBody}>
                    <span className={addStyles.poster} aria-hidden="true">
                      {poster ? (
                        <img src={poster} alt="" loading="lazy" />
                      ) : (
                        <Icon name="film" size={16} />
                      )}
                    </span>
                    <span className={addStyles.text}>
                      <strong>{item.title}</strong>
                      {year && <span>{year}</span>}
                    </span>
                    {inMarathon && <Badge>{t('votes.dialog.already')}</Badge>}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )
  }

  return (
    <Dialog
      open
      onClose={() => !saving && onClose()}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            {t('common:actions.cancel')}
          </Button>
          <Button
            variant="primary"
            icon="arrow-right"
            disabled={picked === null}
            loading={saving}
            onClick={() => void send()}
          >
            {submitLabel}
          </Button>
        </>
      }
    >
      <p>{body}</p>
      <TextField
        label={t('votes.dialog.search')}
        hideLabel
        type="search"
        icon="search"
        value={query}
        onChange={setQuery}
        placeholder={t('votes.dialog.search')}
        autoComplete="off"
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
