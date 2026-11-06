import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { cx } from '../../utils/cx'
import { nextIndexForKey } from '../../utils/rovingFocus'
import type { IconName } from '../Icon/icons'
import Icon from '../Icon/Icon'
import styles from './Menu.module.css'

export type MenuItem =
  | {
      kind?: 'item'
      label: string
      icon?: IconName
      danger?: boolean
      to?: string
      onSelect?: () => void
    }
  | { kind: 'divider' }

interface MenuProps {
  /** Accessible name of the trigger (it may show only an avatar). */
  label: string
  trigger: ReactNode
  triggerClassName?: string
  items: MenuItem[]
  align?: 'left' | 'right'
  /** Optional non-interactive block at the top, e.g. the signed-in name and email. */
  header?: ReactNode
}

/**
 * Menu button (WAI-ARIA pattern): the button toggles a role="menu" list,
 * arrows move between items, Esc closes and returns focus to the button,
 * a click outside or Tab closes it.
 */
export default function Menu({
  label,
  trigger,
  triggerClassName,
  items,
  align = 'left',
  header,
}: MenuProps) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  const menuItems = () => listRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []

  // Opening moves focus into the menu, so arrow keys work right away.
  useEffect(() => {
    if (open) menuItems()[0]?.focus()
  }, [open])

  // Outside clicks close it. The listener exists only while the menu is open.
  useEffect(() => {
    if (!open) return
    const handlePointer = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointer)
    return () => document.removeEventListener('pointerdown', handlePointer)
  }, [open])

  function close(returnFocus: boolean) {
    setOpen(false)
    if (returnFocus) buttonRef.current?.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      return close(true)
    }
    if (event.key === 'Tab') return close(false)
    const list = Array.from(menuItems())
    const current = list.indexOf(document.activeElement as HTMLElement)
    const next = nextIndexForKey(event, current, list.length)
    if (next !== null) list[next]?.focus()
  }

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        className={triggerClassName}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        {trigger}
      </button>

      {open && (
        <div
          ref={listRef}
          id={menuId}
          role="menu"
          aria-label={label}
          className={cx(styles.menu, align === 'right' && styles.right)}
          onKeyDown={handleKeyDown}
        >
          {header && <div className={styles.header}>{header}</div>}
          {items.map((item, i) => {
            if (item.kind === 'divider') return <hr key={i} className={styles.divider} />
            const content = (
              <>
                {item.icon && <Icon name={item.icon} size={18} />}
                {item.label}
              </>
            )
            const className = cx(styles.item, item.danger && styles.danger)
            const select = () => {
              close(!item.to)
              item.onSelect?.()
            }
            // tabIndex -1: items are reached with arrows, not Tab (one Tab stop for the menu).
            return item.to ? (
              <Link
                key={i}
                to={item.to}
                role="menuitem"
                tabIndex={-1}
                className={className}
                onClick={select}
              >
                {content}
              </Link>
            ) : (
              <button
                key={i}
                type="button"
                role="menuitem"
                tabIndex={-1}
                className={className}
                onClick={select}
              >
                {content}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
