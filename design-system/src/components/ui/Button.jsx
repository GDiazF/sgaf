import { forwardRef } from 'react'
import { cn } from '../../lib/cn.js'

const VARIANT_CLASS = {
  primary: 'btn--primary',
  secondary: 'btn--secondary',
  quiet: 'btn--secondary btn--quiet',
  danger: 'btn--danger',
  outline: 'btn--outline',
  ghost: 'btn--ghost',
  'danger-outline': 'btn--danger-outline',
  'ghost-danger': 'btn--ghost btn--danger',
}

const ACTION_TO_VARIANT = {
  save: 'primary',
  accept: 'primary',
  approve: 'primary',
  create: 'primary',
  cancel: 'secondary',
  back: 'secondary',
  clear: 'quiet',
  delete: 'danger',
  reject: 'danger-outline',
  cancelMine: 'ghost-danger',
  export: 'secondary',
  import: 'secondary',
  download: 'secondary',
  search: 'secondary',
  edit: 'outline',
  view: 'outline',
  tertiary: 'ghost',
}

const SIZE_CLASS = {
  sm: 'btn--sm',
  md: '',
  lg: 'btn--lg',
}

/**
 * Semantic mapping (brand-spec):
 * <Button action="save" /> resolves variant automatically.
 * iconOnly: usa `title` o, si falta, `aria-label` como tooltip al hover.
 */
export const Button = forwardRef(function Button(
  {
    variant,
    action,
    size = 'md',
    iconOnly = false,
    loading = false,
    className,
    type = 'button',
    disabled,
    children,
    title,
    'aria-label': ariaLabel,
    tooltip,
    ...rest
  },
  ref,
) {
  const resolved =
    variant ||
    (action ? ACTION_TO_VARIANT[action] : null) ||
    'primary'

  const tip =
    title ??
    tooltip ??
    (iconOnly ? ariaLabel : undefined)

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      aria-label={ariaLabel}
      title={tip}
      className={cn(
        'btn',
        VARIANT_CLASS[resolved] || VARIANT_CLASS.primary,
        SIZE_CLASS[size],
        iconOnly && 'btn--icon',
        loading && 'is-loading is-disabled',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
})

/**
 * Botón solo icono.
 * Requiere `aria-label` (accesibilidad). Ese texto también se usa como tooltip
 * nativo al pasar el mouse, salvo que se pase `title` o `tooltip` explícito.
 */
export function IconButton({
  danger = false,
  className,
  children,
  title,
  tooltip,
  'aria-label': ariaLabel,
  ...rest
}) {
  const tip = title ?? tooltip ?? ariaLabel

  return (
    <button
      type="button"
      className={cn('icon-btn', danger && 'icon-btn--danger', className)}
      aria-label={ariaLabel}
      title={tip}
      {...rest}
    >
      {children}
    </button>
  )
}

export function ButtonSplit({ children, className }) {
  return <div className={cn('btn-split', className)}>{children}</div>
}

export { ACTION_TO_VARIANT }
