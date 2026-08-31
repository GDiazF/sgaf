import { useEffect, useId, useState, Children, cloneElement, isValidElement } from 'react'
import { Button } from './Button.jsx'
import { Icon } from '../../icons/Icon.jsx'
import { cn } from '../../lib/cn.js'

/**
 * Barra de filtros canónica:
 * .filters[data-filters] → __primary (búsqueda) → __toolbar (toggle + acciones) → __panel
 *
 * Con `advanced`: los filtros viven en un panel colapsable (≤1023px).
 * Desktop (≥1024): panel siempre visible en línea.
 *
 * demoMode: 'desktop' | 'tablet' | 'mobile' — para frames del showcase.
 */
export function FiltersBar({
  children,
  advanced,
  onSearch,
  onClear,
  searchLabel = 'Buscar',
  clearLabel = 'Limpiar',
  filtersLabel = 'Filtros',
  /** Nº de filtros activos (badge en el toggle) */
  activeCount = 0,
  defaultOpen = false,
  /** @deprecated Prefer demoMode="desktop" */
  forceOpen = false,
  /** 'desktop' | 'tablet' | 'mobile' — layout forzado en showcase */
  demoMode,
  /** Acciones extra en la misma fila (p. ej. Nuevo, Feriados) */
  actions,
  className,
  id,
  style,
}) {
  const autoId = useId()
  const panelId = `${autoId}-panel`
  const hasPanel = Boolean(advanced)
  const isDemoDesktop = forceOpen || demoMode === 'desktop'
  const isDemoNarrow = demoMode === 'mobile' || demoMode === 'tablet'
  const [open, setOpen] = useState(isDemoDesktop ? true : defaultOpen)
  const [narrow, setNarrow] = useState(isDemoNarrow || !isDemoDesktop)

  useEffect(() => {
    if (isDemoDesktop) {
      setOpen(true)
      setNarrow(false)
      return undefined
    }
    if (isDemoNarrow) {
      setOpen(defaultOpen)
      setNarrow(true)
      return undefined
    }
    const mq = window.matchMedia('(max-width: 1023px)')
    const sync = () => {
      const isNarrow = mq.matches
      setNarrow(isNarrow)
      if (hasPanel) {
        setOpen(isNarrow ? defaultOpen : true)
      }
    }
    sync()
    mq.addEventListener?.('change', sync)
    return () => mq.removeEventListener?.('change', sync)
  }, [isDemoDesktop, isDemoNarrow, defaultOpen, hasPanel])

  const showToggle = hasPanel && narrow
  const panelOpen = !narrow || open

  const searchFields = Children.map(children, (child) => {
    if (!isValidElement(child)) return child
    return cloneElement(child, {
      className: cn(child.props.className, 'filters__search'),
    })
  })

  return (
    <form
      id={id}
      role="search"
      className={cn('filters', className)}
      data-filters
      data-filters-narrow={narrow || undefined}
      data-filters-open={panelOpen || undefined}
      style={style}
      onSubmit={(e) => {
        e.preventDefault()
        onSearch?.(e)
      }}
    >
      <div className="filters__primary">{searchFields}</div>

      <div className="filters__toolbar">
        {showToggle ? (
          <button
            type="button"
            className={cn('filters__toggle', open && 'is-open')}
            data-filters-toggle
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="filters__toggle-label">
              {filtersLabel}
              {activeCount > 0 ? (
                <span className="filters__toggle-count" aria-label={`${activeCount} activos`}>
                  {activeCount}
                </span>
              ) : null}
            </span>
            <Icon name="chevron" className="filters__toggle__chevron" size={16} />
          </button>
        ) : null}

        <div className="filters__actions">
          <Button type="submit" variant="primary" size={narrow ? 'sm' : undefined}>
            {searchLabel}
          </Button>
          {onClear ? (
            <Button
              type="button"
              variant="quiet"
              size={narrow ? 'sm' : undefined}
              data-filters-clear
              onClick={onClear}
            >
              {clearLabel}
            </Button>
          ) : null}
          {actions ? <div className="filters__extra">{actions}</div> : null}
        </div>
      </div>

      {hasPanel ? (
        <div
          id={panelId}
          className={cn('filters__advanced', panelOpen && 'is-open')}
          data-filters-advanced
          hidden={narrow && !open ? true : undefined}
        >
          {advanced}
        </div>
      ) : null}
    </form>
  )
}
