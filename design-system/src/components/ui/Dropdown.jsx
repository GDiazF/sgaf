import { cn } from '../../lib/cn.js'

/**
 * Menú desplegable canónico (.dropdown / .dropdown__menu / .dropdown__item).
 * Controlado: open + onOpenChange. Cierre al clic fuera lo maneja el caller
 * o un wrapper con useEffect.
 */
export function Dropdown({ open = false, className, children, align = 'end', ...rest }) {
  return (
    <div
      className={cn('dropdown', open && 'is-open', className)}
      data-align={align}
      {...rest}
    >
      {children}
    </div>
  )
}

export function DropdownMenu({ className, children, ...rest }) {
  return (
    <div className={cn('dropdown__menu', className)} role="menu" {...rest}>
      {children}
    </div>
  )
}

export function DropdownItem({
  as: Comp = 'button',
  danger = false,
  className,
  children,
  type = 'button',
  ...rest
}) {
  const props =
    Comp === 'button'
      ? { type, ...rest }
      : rest

  return (
    <Comp
      className={cn('dropdown__item', danger && 'dropdown__item--danger', className)}
      role="menuitem"
      {...props}
    >
      {children}
    </Comp>
  )
}

export function DropdownDivider({ className }) {
  return <div className={cn('dropdown__divider', className)} role="separator" />
}
