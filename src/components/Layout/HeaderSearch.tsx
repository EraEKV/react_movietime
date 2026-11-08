import { useTranslation } from 'react-i18next'
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { createSearchParams, useLocation, useNavigate } from 'react-router'
import fieldStyles from '../../shared/ui/Field/Field.module.css'
import Button from '../../shared/ui/Button/Button'
import Icon from '../../shared/ui/Icon/Icon'
import styles from './Layout.module.css'

/**
 * Header search: submitting opens a catalog with ?q=…, where the catalog does the searching.
 * On movie pages it searches movies, everywhere else series (the app's main focus).
 */
function useHeaderSearch(onDone?: () => void) {
  const { t } = useTranslation()
  const id = useId()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const catalog = pathname.startsWith('/movies') ? '/movies' : '/series'
  const [text, setText] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const query = text.trim()
    if (!query) return
    navigate({ pathname: catalog, search: `?${createSearchParams({ q: query })}` })
    setText('')
    onDone?.()
  }

  const label = t(catalog === '/movies' ? 'header.searchMovies' : 'header.searchSeries')
  return { id, text, setText, handleSubmit, label }
}

/** The field in the bar itself: from 1180px, where there is room for it. */
export default function HeaderSearch() {
  const { t } = useTranslation()
  const { id, text, setText, handleSubmit, label } = useHeaderSearch()

  return (
    <form role="search" className={styles.search} onSubmit={handleSubmit}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className={fieldStyles.control}>
        <Icon name="search" size={18} className={fieldStyles.leading} />
        <input
          id={id}
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('header.search')}
          autoComplete="off"
        />
      </div>
    </form>
  )
}

/**
 * Below 1180px the bar has no room for a field, so the search icon opens this one over the
 * whole header (any page, no jump to the catalog first). Escape or Cancel closes it, and so
 * does a search; the caller puts focus back on the icon.
 */
export function HeaderSearchOverlay({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const { id, text, setText, handleSubmit, label } = useHeaderSearch(onClose)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => input.current?.focus(), [])

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') onClose()
  }

  return (
    <form
      role="search"
      className={styles.searchOverlay}
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
    >
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className={`${fieldStyles.control} ${styles.searchOverlayField}`}>
        <Icon name="search" size={18} className={fieldStyles.leading} />
        <input
          ref={input}
          id={id}
          type="search"
          enterKeyHint="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={label}
          autoComplete="off"
        />
      </div>
      <Button variant="ghost" onClick={onClose}>
        {t('actions.cancel')}
      </Button>
    </form>
  )
}
