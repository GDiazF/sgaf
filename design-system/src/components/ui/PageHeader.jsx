import { Icon } from '../../icons/Icon.jsx'
import { cn } from '../../lib/cn.js'

/**
 * Breadcrumbs canónicos OpenDesign:
 * <nav class="breadcrumbs"><a/><span class="breadcrumbs__sep"/>/<span class="breadcrumbs__current"/>
 */
export function Breadcrumbs({ items = [], className, linkComponent: LinkComp = 'a' }) {
  if (!items.length) return null
  return (
    <nav className={cn('breadcrumbs', className)} aria-label="Miga de pan">
      {items.map((item, i) => {
        const isLast = i === items.length - 1
        const href = item.to || item.href
        const linkProps = LinkComp === 'a' ? { href: href || '#' } : { to: href || '#' }
        return (
          <span key={`${item.label}-${i}`} style={{ display: 'contents' }}>
            {i > 0 ? <span className="breadcrumbs__sep">/</span> : null}
            {href && !isLast ? (
              <LinkComp {...linkProps}>{item.label}</LinkComp>
            ) : (
              <span className={cn(isLast && 'breadcrumbs__current')}>{item.label}</span>
            )}
          </span>
        )
      })}
    </nav>
  )
}

/**
 * PageHeader canónico (.page-header__identity + __body + __icon-slot + __content).
 */
export function PageHeader({
  icon,
  title,
  description,
  actions,
  breadcrumbs,
  split = false,
  compact = false,
  noIcon = false,
  showIconMobile = false,
  soloActions = false,
  linkComponent,
  className,
}) {
  return (
    <header
      className={cn(
        'page-header',
        split && 'page-header--split',
        compact && 'page-header--compact',
        noIcon && 'page-header--no-icon',
        showIconMobile && 'page-header--show-icon-mobile',
        className,
      )}
    >
      <div className="page-header__identity">
        {breadcrumbs?.length ? (
          <Breadcrumbs items={breadcrumbs} linkComponent={linkComponent} />
        ) : null}
        <div className="page-header__body">
          {!noIcon && icon ? (
            <div className="page-header__icon-slot" aria-hidden="true" data-page-icon-slot>
              <Icon name={icon} className="page-header__icon icon" />
            </div>
          ) : null}
          <div className="page-header__content">
            <h1 className="page-header__title">{title}</h1>
            {description ? <p className="page-header__desc">{description}</p> : null}
          </div>
        </div>
      </div>
      {actions ? (
        <div className={cn('page-header__actions', soloActions && 'page-header__actions--solo')}>
          {actions}
        </div>
      ) : null}
    </header>
  )
}
