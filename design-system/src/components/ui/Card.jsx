import { cn } from '../../lib/cn.js'
import { Icon } from '../../icons/Icon.jsx'

export function Card({ children, className, ...rest }) {
  return (
    <div className={cn('card', className)} {...rest}>
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, actions, className }) {
  return (
    <div className={cn('card__header', className)}>
      <div>
        {title ? <h2 className="card__title">{title}</h2> : null}
        {subtitle ? <p className="card__subtitle">{subtitle}</p> : null}
      </div>
      {actions || null}
    </div>
  )
}

export function MetricStrip({ items = [], className }) {
  return (
    <div className={cn('metric-strip', className)}>
      {items.map((item) => {
        const interactive = typeof item.onClick === 'function'
        const Comp = interactive ? 'button' : 'div'
        return (
          <Comp
            key={item.label}
            type={interactive ? 'button' : undefined}
            className={cn(
              'metric-cell',
              interactive && 'metric-cell--interactive',
              item.active && 'is-active',
            )}
            onClick={item.onClick}
            aria-pressed={interactive ? !!item.active : undefined}
          >
            <div className="metric-cell__label">{item.label}</div>
            <div className="metric-cell__value">{item.value}</div>
            {item.hint ? <div className="metric-cell__hint">{item.hint}</div> : null}
          </Comp>
        )
      })}
    </div>
  )
}

export function AccessList({ items = [], className, attached = false }) {
  return (
    <ul className={cn('access-list', attached && 'access-list--attached', className)}>
      {items.map((item) => (
        <li key={item.label}>
          <a href={item.href || '#'} className="access-list__item" onClick={item.onClick}>
            {item.icon ? (
              <span className="access-list__icon">
                <Icon name={item.icon} size={18} />
              </span>
            ) : null}
            <span className="access-list__body">
              <span className="access-list__label">{item.label}</span>
              {item.desc || item.meta ? (
                <span className="access-list__desc">{item.desc || item.meta}</span>
              ) : null}
            </span>
            <Icon name="chevron" size={16} className="access-list__arrow" />
          </a>
        </li>
      ))}
    </ul>
  )
}

export function FeedList({ items = [], className }) {
  return (
    <ul className={cn('feed-list', className)}>
      {items.map((item, i) => (
        <li key={item.id || i} className="feed-item">
          {(item.badge || item.date) && (
            <div className="feed-item__meta">
              {item.badge || null}
              {item.date ? <span className="feed-item__date">{item.date}</span> : null}
            </div>
          )}
          <h3 className="feed-item__title">{item.title}</h3>
          {item.excerpt || item.meta ? (
            <p className="feed-item__excerpt">{item.excerpt || item.meta}</p>
          ) : null}
        </li>
      ))}
    </ul>
  )
}

export { ChartCard } from './ChartCard.jsx'
