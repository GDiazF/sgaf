import { Icon } from '../../icons/Icon.jsx'
import { cn } from '../../lib/cn.js'

const VARIANT = {
  info: 'alert--info',
  success: 'alert--success',
  warning: 'alert--warning',
  danger: 'alert--danger',
}

export function Alert({
  variant = 'info',
  title,
  children,
  onClose,
  className,
  ...rest
}) {
  return (
    <div className={cn('alert', VARIANT[variant], className)} role="alert" {...rest}>
      <div>
        {title ? <div className="alert__title">{title}</div> : null}
        {children}
      </div>
      {onClose ? (
        <button type="button" className="alert__close" onClick={onClose} aria-label="Cerrar">
          <Icon name="close" size={14} />
        </button>
      ) : null}
    </div>
  )
}
