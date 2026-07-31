import { cn } from '../../lib/cn.js'

const VARIANT = {
  neutral: 'badge--neutral',
  accent: 'badge--accent',
  success: 'badge--success',
  warning: 'badge--warning',
  danger: 'badge--danger',
}

export function Badge({ variant = 'neutral', dot = false, className, children, ...rest }) {
  return (
    <span
      className={cn('badge', VARIANT[variant], dot && 'badge--dot', className)}
      {...rest}
    >
      {children}
    </span>
  )
}
