import { Link, type LinkProps } from 'react-router'
import { buttonClass, type ButtonSize, type ButtonVariant } from '../Button/variants'
import type { IconName } from '../Icon/icons'
import Icon from '../Icon/Icon'

interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: IconName
  block?: boolean
  /** Square, icon only. Pass aria-label: there is no visible text. */
  iconOnly?: boolean
}

/** Navigation that looks like a button. It stays a real link: middle-click, "open in new tab" work. */
export default function ButtonLink({
  variant = 'secondary',
  size = 'md',
  icon,
  block = false,
  iconOnly = false,
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={buttonClass(variant, size, { block, iconOnly, className })} {...props}>
      {icon && <Icon name={icon} size={size === 'sm' ? 16 : 18} />}
      {children}
    </Link>
  )
}
