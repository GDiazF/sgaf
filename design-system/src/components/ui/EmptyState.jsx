import { Button } from './Button.jsx'
import { cn } from '../../lib/cn.js'

export function EmptyState({
  title = 'Sin resultados',
  description,
  action,
  icon,
  className,
  variant,
  ...rest
}) {
  return (
    <div
      className={cn(
        'empty-state',
        variant && `empty-state--${variant}`,
        className,
      )}
      {...rest}
    >
      {icon ? icon : null}
      <p className="empty-state__title">{title}</p>
      {description ? <p className="empty-state__desc">{description}</p> : null}
      {action ? <div className="empty-state__actions">{action}</div> : null}
    </div>
  )
}

export function Skeleton({ className, rows = 6, cols: _cols = 4 }) {
  const widths = ['94%', '100%', '88%', '96%', '82%', '100%', '90%', '86%']
  return (
    <div className={cn('skeleton-table skeleton-table--bars', className)} aria-hidden="true">
      <div className="skeleton skeleton--title" style={{ width: '32%' }} />
      <div className="skeleton-table__bars">
        {Array.from({ length: Math.max(1, rows) }).map((_, r) => (
          <div
            key={r}
            className="skeleton skeleton--row"
            style={{ width: widths[r % widths.length] }}
          />
        ))}
      </div>
    </div>
  )
}

export function PermissionBlock({
  title = 'Sin permiso de edición',
  description = 'Su perfil solo permite consulta en este módulo.',
  className,
  style,
}) {
  return (
    <div className={cn('permission-block', className)} style={style}>
      <svg
        className="permission-block__icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        aria-hidden
      >
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
      <div>
        <div className="permission-block__title">{title}</div>
        <p className="permission-block__desc">{description}</p>
      </div>
    </div>
  )
}

export function ActionBlock({ hint, hintVariant = 'warning', children, className, style }) {
  return (
    <div className={cn('action-block', className)} style={style}>
      {children}
      {hint ? (
        <span className={cn('action-hint', hintVariant && `action-hint--${hintVariant}`)}>{hint}</span>
      ) : null}
    </div>
  )
}

export function EmptyStateWithAction({
  title,
  description,
  onAction,
  actionLabel = 'Crear',
}) {
  return (
    <EmptyState
      title={title}
      description={description}
      action={
        onAction ? (
          <Button variant="primary" onClick={onAction}>
            {actionLabel}
          </Button>
        ) : null
      }
    />
  )
}
