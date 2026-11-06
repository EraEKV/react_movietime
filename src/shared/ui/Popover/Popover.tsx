import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { cx } from '../../lib/cx'
import styles from './Popover.module.css'

interface PopoverProps {
  /** Accessible name of the trigger and of the panel. */
  label: string
  trigger: ReactNode
  triggerClassName?: string
  /** Panel content; `close` lets an action inside (a link, "Done") dismiss the panel. */
  children: (close: () => void) => ReactNode
}

/**
 * A button that toggles a non-modal panel with any content (unlike Menu, whose children
 * are only menu items). Esc closes it and returns focus to the button, a click outside
 * closes it, Tab moves on normally. On phones the panel spans the width under the header.
 */
export default function Popover({ label, trigger, triggerClassName, children }: PopoverProps) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return
    const handlePointer = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointer)
    return () => document.removeEventListener('pointerdown', handlePointer)
  }, [open])

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Escape') return
    event.preventDefault()
    setOpen(false)
    buttonRef.current?.focus()
  }

  return (
    <div className={styles.wrap} ref={wrapRef} onKeyDown={handleKeyDown}>
      <button
        ref={buttonRef}
        type="button"
        className={cx(styles.trigger, triggerClassName)}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        {trigger}
      </button>
      {open && (
        <div id={panelId} role="dialog" aria-label={label} className={styles.panel}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}
