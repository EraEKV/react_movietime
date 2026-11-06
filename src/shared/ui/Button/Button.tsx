import type { ButtonHTMLAttributes } from 'react'
import type { IconName } from '../Icon/icons'
import Icon from '../Icon/Icon'
import { buttonClass, spinnerClass, type ButtonSize, type ButtonVariant } from './variants'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: IconName
  iconRight?: IconName
  /** Shows a spinner, keeps the label, and blocks repeated clicks. */
  loading?: boolean
  block?: boolean
}

export default function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  iconRight,
  loading = false,
  block = false,
  type = 'button',
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const iconSize = size === 'sm' ? 16 : 18
  return (
    <button
      type={type}
      className={buttonClass(variant, size, { block, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <span className={spinnerClass} aria-hidden="true" />
      ) : (
        icon && <Icon name={icon} size={iconSize} />
      )}
      {children}
      {iconRight && <Icon name={iconRight} size={16} />}
    </button>
  )
}
