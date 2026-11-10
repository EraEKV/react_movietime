import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import styles from './HoverCard.module.css'

interface HoverCardProps {
  /** What the card shows. It repeats what the trigger already says, so it is hidden from
   *  screen readers (the trigger keeps its own accessible name). */
  content: ReactNode
  /** Turn the card off, e.g. while something is being dragged. */
  disabled?: boolean
  children: ReactNode
}

const OPEN_DELAY = 250
const CLOSE_DELAY = 120
const GAP = 8
const MARGIN = 8

/**
 * A small floating card for a mouse hover or keyboard focus on the wrapped element. It is
 * rendered in a portal, so a clipped or tiny parent (a calendar day cell) does not matter:
 * it sits above the trigger, or below when there is no room, and stays inside the screen.
 * The pointer may move onto the card, Esc closes it. Touch has no hover, so it never opens
 * from a tap and cannot get in the way of a tap or a drag.
 */
export default function HoverCard({ content, disabled = false, children }: HoverCardProps) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const timer = useRef<number | undefined>(undefined)

  const schedule = useCallback((next: boolean, delay: number) => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setOpen(next), delay)
  }, [])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const visible = open && !disabled

  // Measure after the card is in the DOM, then place it before the browser paints.
  useLayoutEffect(() => {
    if (!visible || !triggerRef.current || !cardRef.current) return
    const anchor = triggerRef.current.getBoundingClientRect()
    const card = cardRef.current.getBoundingClientRect()
    const above = anchor.top - card.height - GAP >= MARGIN
    const top = above ? anchor.top - card.height - GAP : anchor.bottom + GAP
    const centred = anchor.left + anchor.width / 2 - card.width / 2
    const left = Math.min(Math.max(centred, MARGIN), window.innerWidth - card.width - MARGIN)
    setPosition({ left, top })
  }, [visible])

  useEffect(() => {
    if (!visible) return
    const close = () => setOpen(false)
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && close()
    document.addEventListener('keydown', onKey)
    // Scrolling moves the trigger away from a card that is fixed to the screen.
    window.addEventListener('scroll', close, true)
    return () => {
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', close, true)
    }
  }, [visible])

  const hide = () => {
    setPosition(null)
    schedule(false, CLOSE_DELAY)
  }

  return (
    <div
      ref={triggerRef}
      className={styles.trigger}
      onPointerEnter={(event) => event.pointerType === 'mouse' && schedule(true, OPEN_DELAY)}
      onPointerLeave={hide}
      onPointerDown={() => {
        window.clearTimeout(timer.current)
        setOpen(false)
      }}
      onFocus={(event) => event.target.matches(':focus-visible') && schedule(true, 0)}
      onBlur={hide}
    >
      {children}
      {visible &&
        createPortal(
          <div
            ref={cardRef}
            className={styles.card}
            aria-hidden="true"
            style={{
              left: position?.left ?? 0,
              top: position?.top ?? 0,
              visibility: position ? 'visible' : 'hidden',
            }}
            onPointerEnter={() => window.clearTimeout(timer.current)}
            onPointerLeave={hide}
          >
            {content}
          </div>,
          document.body,
        )}
    </div>
  )
}
