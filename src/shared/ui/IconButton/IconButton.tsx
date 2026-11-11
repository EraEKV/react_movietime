import type { ButtonHTMLAttributes, Ref } from 'react'
import { buttonClass } from '../Button/variants'
import type { IconName } from '../Icon/icons'
import Icon from '../Icon/Icon'

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: IconName
  /** Required: an icon-only button must still have an accessible name. */
  label: string
  variant?: 'ghost' | 'secondary'
  size?: 'sm' | 'md'
  pressed?: boolean
  /** React 19 passes ref as a normal prop; it goes to the <button>. */
  ref?: Ref<HTMLButtonElement>
}

export default function IconButton({
  icon,
  label,
  variant = 'ghost',
  size = 'md',
  pressed,
  type = 'button',
  className,
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={buttonClass(variant, size, { iconOnly: true, pressed, className })}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      {...props}
    >
      <Icon name={icon} size={size === 'sm' ? 18 : 20} />
    </button>
  )
}
