import { cx } from '../../shared/lib/cx'
import styles from './Button.module.css'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-solid'
export type ButtonSize = 'sm' | 'md' | 'lg'

const VARIANT_CLASS: Record<ButtonVariant, string | undefined> = {
  primary: styles.primary,
  secondary: styles.secondary,
  ghost: styles.ghost,
  danger: styles.danger,
  'danger-solid': styles.dangerSolid,
}

/** Shared by Button, IconButton and ButtonLink so a link can look exactly like a button. */
export function buttonClass(
  variant: ButtonVariant,
  size: ButtonSize,
  options: { block?: boolean; iconOnly?: boolean; pressed?: boolean; className?: string } = {},
): string {
  return cx(
    styles.button,
    VARIANT_CLASS[variant],
    size !== 'md' && styles[size],
    options.block && styles.block,
    options.iconOnly && styles.iconOnly,
    options.pressed && styles.pressed,
    options.className,
  )
}

export const spinnerClass = styles.spinner
