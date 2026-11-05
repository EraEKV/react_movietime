import { useId, useState, type FormEvent } from 'react'
import { createSearchParams, useNavigate } from 'react-router'
import fieldStyles from '../Field/Field.module.css'
import Icon from '../Icon/Icon'
import styles from './Layout.module.css'

/** Header search: submitting opens the catalog with ?q=…, where the catalog does the searching. */
export default function HeaderSearch() {
  const id = useId()
  const navigate = useNavigate()
  const [text, setText] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const query = text.trim()
    if (!query) return
    navigate({ pathname: '/', search: `?${createSearchParams({ q: query })}` })
    setText('')
  }

  return (
    <form role="search" className={styles.search} onSubmit={handleSubmit}>
      <label htmlFor={id} className="sr-only">
        Search series
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
