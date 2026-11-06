import { useId, useState, type FormEvent } from 'react'
import { createSearchParams, useLocation, useNavigate } from 'react-router'
import fieldStyles from '../Field/Field.module.css'
import Icon from '../Icon/Icon'
import styles from './Layout.module.css'

/**
 * Header search: submitting opens a catalog with ?q=…, where the catalog does the searching.
 * On movie pages it searches movies, everywhere else series (the app's main focus).
 */
export default function HeaderSearch() {
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
  }

  return (
    <form role="search" className={styles.search} onSubmit={handleSubmit}>
      <label htmlFor={id} className="sr-only">
        {catalog === '/movies' ? 'Search movies' : 'Search series'}
      </label>
      <div className={fieldStyles.control}>
        <Icon name="search" size={18} className={fieldStyles.leading} />
        <input
          id={id}
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Search"
          autoComplete="off"
        />
      </div>
    </form>
  )
}
