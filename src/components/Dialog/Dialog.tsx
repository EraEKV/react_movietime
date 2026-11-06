import { useTranslation } from 'react-i18next'
import { useEffect, useId, useRef, type MouseEvent, type ReactNode } from 'react'
import { cx } from '../../shared/lib/cx'
import IconButton from '../IconButton/IconButton'
import styles from './Dialog.module.css'

export interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  /** 'sheet' slides up from the bottom (mobile filters, pickers). */
  variant?: 'dialog' | 'sheet'
}

/**
 * Built on the native <dialog> element: showModal() puts it in the top layer,
 * makes the rest of the page inert (focus trap), and closes on Esc.
 * Focus returns to the element that opened it when it closes.
 */
export default function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  variant = 'dialog',
}: DialogProps) {
  const { t } = useTranslation()
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  // React state is the source of truth; this effect syncs it to the DOM API.
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  // Clicks on the ::backdrop land on the <dialog> element itself, never on its content.
  function handleClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) onClose()
  }

  return (
    <dialog
      ref={ref}
      className={cx(styles.dialog, variant === 'sheet' && styles.sheet)}
      aria-labelledby={titleId}
      // Esc fires "cancel": let React close it, so `open` stays in sync.
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={handleClick}
    >
      {variant === 'sheet' && <div className={styles.grab} aria-hidden="true" />}
      <div className={styles.header}>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        <IconButton icon="x" label={t('actions.close')} onClick={onClose} />
      </div>
      {/* Children mount only while open, so their state resets every time. */}
      {open && <div className={styles.body}>{children}</div>}
      {open && footer && <div className={styles.footer}>{footer}</div>}
    </dialog>
  )
}
