import { cn } from '../../lib/cn.js'

/**
 * Contenedor de gráfico canónico OpenDesign (.chart-card).
 * Si no hay título/acciones, solo renderiza el body (donut, combo, etc.).
 */
export function ChartCard({
  title,
  subtitle,
  range,
  actions,
  headerExtra,
  children,
  className,
  style,
  bodyClassName,
  bodyStyle,
  bodyProps,
}) {
  const hasHeader = Boolean(title || subtitle || range || actions || headerExtra)

  return (
    <div className={cn('chart-card', className)} style={style} data-component="ChartCard">
      {hasHeader ? (
        <div className="chart-card__header">
          {title || subtitle ? (
            <div className="chart-card__titles">
              {title ? <div className="chart-card__title">{title}</div> : null}
              {subtitle ? <div className="chart-card__subtitle">{subtitle}</div> : null}
            </div>
          ) : null}
          {range ? <span className="chart-card__range">{range}</span> : null}
          {actions ? <div className="chart-card__actions">{actions}</div> : null}
          {headerExtra}
        </div>
      ) : null}
      <div className={cn('chart-card__body', bodyClassName)} style={bodyStyle} {...bodyProps}>
        {children}
      </div>
    </div>
  )
}
