import { Button } from './Button.jsx'
import { cn } from '../../lib/cn.js'

const STATUS_ICONS = {
  info: (
    <svg className="form-status__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  ),
  loading: (
    <svg className="form-status__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  ),
  error: (
    <svg className="form-status__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M15 9l-6 6M9 9l6 6" />
    </svg>
  ),
  success: (
    <svg className="form-status__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="M22 4L12 14.01l-3-3" />
    </svg>
  ),
  warning: (
    <svg className="form-status__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  ),
}

/**
 * Banner de estado del formulario (.form-status--*).
 * Loading anima .form-status__icon vía CSS (form-spin).
 */
export function FormStatus({
  variant = 'info',
  title,
  description,
  children,
  className,
  role,
  style,
  hideIcon = false,
}) {
  const resolvedRole =
    role || (variant === 'error' ? 'alert' : variant === 'loading' ? 'status' : 'status')
  const live = variant === 'loading' ? { 'aria-live': 'polite' } : {}

  return (
    <div
      className={cn('form-status', `form-status--${variant}`, className)}
      role={resolvedRole}
      style={style}
      {...live}
    >
      {!hideIcon ? STATUS_ICONS[variant] || STATUS_ICONS.info : null}
      <div>
        {title ? <div className="form-status__title">{title}</div> : null}
        {description ? <div className="form-status__desc">{description}</div> : null}
        {!title && !description && children ? children : null}
        {title && children ? children : null}
      </div>
    </div>
  )
}

export function FormSection({
  title,
  description,
  headerExtra,
  children,
  actions,
  className,
  asGrid = true,
}) {
  return (
    <div className={cn('form-section', className)}>
      {(title || description || headerExtra) && (
        <div className="form-section__header">
          {headerExtra || (
            <>
              {title ? <h2 className="form-section__title">{title}</h2> : null}
              {description ? <p className="form-section__desc">{description}</p> : null}
            </>
          )}
        </div>
      )}
      <div className="form-section__body">
        {asGrid ? <div className="form-grid">{children}</div> : children}
      </div>
      {actions || null}
    </div>
  )
}

export function FormActions({ start, end, crud = false, className, style }) {
  return (
    <div className={cn('form-actions', crud && 'form-actions--crud', className)} style={style}>
      <div className="form-actions__start">{start}</div>
      <div className="form-actions__end">{end}</div>
    </div>
  )
}

/**
 * Shell CRUD. Preferí poner FormActions dentro de cada FormSection
 * (como OpenDesign). Si pasás onCancel/onSubmit sin section actions,
 * se renderiza un footer al final del form.
 */
export function CrudForm({
  children,
  onSubmit,
  onCancel,
  onDelete,
  submitLabel = 'Guardar',
  cancelLabel = 'Cancelar',
  deleteLabel = 'Eliminar',
  submitting = false,
  footer = true,
  className,
}) {
  return (
    <form
      className={cn('crud-form', className)}
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit?.(e)
      }}
    >
      {children}
      {footer && (onCancel || onDelete || onSubmit) ? (
        <FormActions
          crud
          start={
            onDelete ? (
              <Button type="button" variant="danger" onClick={onDelete}>
                {deleteLabel}
              </Button>
            ) : null
          }
          end={
            <>
              {onCancel ? (
                <Button type="button" variant="secondary" onClick={onCancel}>
                  {cancelLabel}
                </Button>
              ) : null}
              <Button type="submit" variant="primary" disabled={submitting} loading={submitting}>
                {submitLabel}
              </Button>
            </>
          }
        />
      ) : null}
    </form>
  )
}

export function DetailView({ children, className }) {
  return <div className={cn('detail-view', className)}>{children}</div>
}

export function DetailGrid({ children, className }) {
  return <div className={cn('detail-grid', className)}>{children}</div>
}

export function DetailItem({ label, children, className, full = false, mono = false }) {
  return (
    <div className={cn('detail-field', full && 'detail-field--full', className)}>
      <div className="detail-field__label">{label}</div>
      <div className={cn('detail-field__value', mono && 'detail-field__value--mono')}>{children}</div>
    </div>
  )
}
