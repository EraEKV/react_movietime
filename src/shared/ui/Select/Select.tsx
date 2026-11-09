import {
  useEffect,
  useLayoutEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react'
import { cx } from '../../lib/cx'
import { nextIndexForKey } from '../../lib/rovingFocus'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import type { Option } from '../../types/common'
import BottomSheet from '../Dialog/BottomSheet'
import Icon from '../Icon/Icon'
import styles from './Select.module.css'

export interface SelectProps<V extends string> {
  /** Id for the trigger, so a <label htmlFor> points at it. */
  id?: string
  /** Accessible name of the list and the title of the phone sheet. */
  label: string
  value: V
  options: Option<V>[]
  onChange: (value: V) => void
  disabled?: boolean
  'aria-describedby'?: string
}

interface Placement {
  top: number
  left: number
  width: number
  maxHeight: number
  up: boolean
}

const GAP = 6
const EDGE = 8
const MAX_LIST = 320

/**
 * A custom select: a listbox popup from tablet up, a bottom sheet with the same options
 * on phones. Esc closes and returns focus to the trigger; arrows, Home/End and typing a
 * letter move between options; Tab closes. Meant to sit inside a Field's `.control` box.
 */
export default function Select<V extends string>({
  id,
  label,
  value,
  options,
  onChange,
  disabled = false,
  'aria-describedby': describedBy,
}: SelectProps<V>) {
  const [open, setOpen] = useState(false)
  const [placement, setPlacement] = useState<Placement | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const typeahead = useRef({ text: '', at: 0 })
  const listId = useId()
  const isPhone = !useMediaQuery('(min-width: 768px)')

  const selected = options.find((o) => o.value === value)
  const optionEls = () => listRef.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? []

  function close(returnFocus: boolean) {
    setOpen(false)
    if (returnFocus) buttonRef.current?.focus()
  }

  function choose(next: V) {
    close(true)
    if (next !== value) onChange(next)
  }

  // Measure before paint so the popup never flashes in the wrong place; flip upwards
  // when there is no room below.
  useLayoutEffect(() => {
    const button = buttonRef.current
    const list = listRef.current
    if (!open || isPhone || !button || !list) return setPlacement(null)
    // Match the visible box (the Field's .control around the trigger), not just the button.
    const rect = (wrapRef.current?.parentElement ?? button).getBoundingClientRect()
    const wanted = Math.min(list.scrollHeight + 2, MAX_LIST)
    const below = window.innerHeight - rect.bottom - GAP - EDGE
    const above = rect.top - GAP - EDGE
    const up = below < wanted && above > below
    const maxHeight = Math.min(wanted, up ? above : below)
    setPlacement({
      top: up ? rect.top - GAP - maxHeight : rect.bottom + GAP,
      left: rect.left,
      width: rect.width,
      maxHeight,
      up,
    })
  }, [open, isPhone])

  // Opening moves focus to the current option (or the first), so arrows work at once.
  useEffect(() => {
    if (!open) return
    const els = Array.from(optionEls())
    const target = els.find((el) => el.getAttribute('aria-selected') === 'true') ?? els[0]
    target?.focus({ preventScroll: false })
  }, [open, placement])

  // Outside clicks, scrolling and resizing close the popup (it is positioned once).
  useEffect(() => {
    if (!open || isPhone) return
    const handlePointer = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const handleMove = (event: Event) => {
      if (!listRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointer)
    window.addEventListener('scroll', handleMove, true)
    window.addEventListener('resize', handleMove)
    return () => {
      document.removeEventListener('pointerdown', handlePointer)
      window.removeEventListener('scroll', handleMove, true)
      window.removeEventListener('resize', handleMove)
    }
  }, [open, isPhone])

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
    }
  }

  function handleListKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      return close(true)
    }
    if (event.key === 'Tab') return close(false)
    const els = Array.from(optionEls())
    const current = els.indexOf(document.activeElement as HTMLElement)
    const next = nextIndexForKey(event, current, els.length)
    if (next !== null) return els[next]?.focus()

    // Typing letters jumps to the next option starting with them.
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && event.key !== ' ') {
      const now = event.timeStamp
      const state = typeahead.current
      state.text = now - state.at > 600 ? event.key : state.text + event.key
      state.at = now
      const needle = state.text.toLowerCase()
      const start = state.text.length === 1 ? current + 1 : current
      const order = [...options.keys()].map((_, i) => (start + i) % options.length)
      const match = order.find((i) => options[i]?.label.toLowerCase().startsWith(needle))
      if (match !== undefined) els[match]?.focus()
    }
  }

  const items = options.map((option) => {
    const isSelected = option.value === value
    return (
      <button
        key={option.value}
        type="button"
        role="option"
        aria-selected={isSelected}
        tabIndex={-1}
        className={cx(styles.option, isSelected && styles.selected)}
        onClick={() => choose(option.value)}
      >
        <span className={styles.optionLabel}>{option.label}</span>
        {isSelected && <Icon name="check" size={18} className={styles.check} />}
      </button>
    )
  })

  const listStyle: CSSProperties | undefined = placement
    ? {
        top: placement.top,
        left: placement.left,
        minWidth: placement.width,
        maxHeight: placement.maxHeight,
      }
    : { visibility: 'hidden', top: 0, left: 0 }

  return (
    <div className={cx(styles.wrap, open && styles.open)} ref={wrapRef}>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        className={styles.trigger}
        disabled={disabled}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-describedby={describedBy}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className={styles.value}>{selected?.label ?? ''}</span>
        <Icon name="chevron-down" size={18} className={styles.chevron} />
      </button>

      {open && !isPhone && (
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={label}
          className={cx(styles.list, placement?.up && styles.up)}
          style={listStyle}
          onKeyDown={handleListKeyDown}
        >
          {items}
        </div>
      )}

      {isPhone && (
        <BottomSheet open={open} onClose={() => close(true)} title={label}>
          <div
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={label}
            className={styles.sheetList}
            onKeyDown={handleListKeyDown}
          >
            {items}
          </div>
        </BottomSheet>
      )}
    </div>
  )
}
