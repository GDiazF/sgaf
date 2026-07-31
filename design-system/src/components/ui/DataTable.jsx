import { useMemo, useState, Fragment } from 'react'
import { Button } from './Button.jsx'
import { EmptyState } from './EmptyState.jsx'
import { Select } from './Field.jsx'
import { Icon } from '../../icons/Icon.jsx'
import { cn } from '../../lib/cn.js'

const SortIcon = () => (
  <svg className="sort-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
    <path d="M8 9l4-4 4 4M8 15l4 4 4-4" />
  </svg>
)

/**
 * Skeleton de carga para tablas — barras horizontales (mismo patrón que Feedback showcase).
 * `cols` se conserva por compatibilidad de API; el layout ya no es grid de celdas.
 */
export function TableSkeleton({ cols: _cols = 4, rows = 6, className }) {
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

export function PageSizeSelector({
  value = 10,
  options = [10, 25, 50, 100],
  onChange,
  id,
  className,
}) {
  return (
    <div className={cn('page-size', className)} data-component="PageSize">
      <label className="page-size__label" htmlFor={id}>
        Mostrar
      </label>
      <Select
        id={id}
        className="page-size__select"
        value={value}
        data-page-size
        aria-label="Registros por página"
        onChange={(e) => onChange?.(Number(e.target.value))}
      >
        {options.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </Select>
      <span className="page-size__suffix">registros</span>
    </div>
  )
}

export function Pagination({ page = 1, pageCount = 1, onChange, className }) {
  if (pageCount < 1) return null

  const maxButtons = 5
  let startPage = Math.max(1, page - Math.floor(maxButtons / 2))
  let endPage = Math.min(pageCount, startPage + maxButtons - 1)
  startPage = Math.max(1, endPage - maxButtons + 1)

  const pages = []
  for (let p = startPage; p <= endPage; p++) pages.push(p)

  return (
    <nav className={cn('pagination', className)} data-pagination aria-label="Paginación">
      <button
        type="button"
        className="pagination__btn"
        aria-label="Anterior"
        disabled={page <= 1}
        onClick={() => onChange?.(page - 1)}
      >
        ‹
      </button>
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          className={cn('pagination__btn', p === page && 'is-active')}
          aria-label={`Página ${p}`}
          aria-current={p === page ? 'page' : undefined}
          onClick={() => onChange?.(p)}
        >
          {p}
        </button>
      ))}
      <button
        type="button"
        className="pagination__btn"
        aria-label="Siguiente"
        disabled={page >= pageCount}
        onClick={() => onChange?.(page + 1)}
      >
        ›
      </button>
    </nav>
  )
}

function isTabletHideCol(col) {
  if (col.tabletHide) return true
  const cls = `${col.className || ''} ${col.headerClassName || ''}`
  return /\bcol--tablet-hide\b/.test(cls)
}

function isActionsCol(col) {
  return col.key === 'actions' || col.cardRole === 'actions' || /\bcol--actions\b/.test(col.className || '')
}

function cellContent(col, row, index) {
  if (col.render) return col.render(row, index)
  const value = row[col.key]
  if (value == null || value === '') return '—'
  return value
}

function plainText(node) {
  if (node == null || node === false) return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(plainText).filter(Boolean).join(' ')
  if (typeof node === 'object' && node.props?.children != null) return plainText(node.props.children)
  return ''
}

/**
 * Listado administrativo canónico OpenDesign.
 * Desktop: tabla completa · Tablet: .col--tablet-hide + fila expandible · Móvil: .record-list
 *
 * Columnas: cardRole = 'title' | 'subtitle' | 'status' | 'field'
 * mobileCardActions(row) → { primary?: { label, onClick }, secondary?: { label, onClick } }
 *
 * fillViewport (default true): el listado usa el alto restante del shell y scrollea
 * el cuerpo (toolbar/footer fijos). Pasar false solo en demos / embeds no-CRUD.
 */
export function DataTable({
  columns = [],
  rows = [],
  loading = false,
  emptyTitle = 'Sin resultados',
  emptyDescription = 'No hay registros que coincidan con los filtros aplicados.',
  emptyAction,
  toolbar,
  totalCount,
  page = 1,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  pageSizeId,
  compact = false,
  responsive = true,
  showFooter = true,
  fillViewport = true,
  getRowKey = (row, i) => row.id ?? i,
  onRowClick,
  onSort,
  sortKey,
  className,
  skeletonCols,
  skeletonRows = 6,
  mobileCardActions,
  recordListLabel = 'Listado en tarjetas',
}) {
  const [expanded, setExpanded] = useState(() => ({}))

  const total = totalCount ?? rows.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize) || 1)
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  const pageInfo =
    total === 0 ? 'Sin registros' : `Mostrando ${from}–${to} de ${total} registros`

  const dataColumns = useMemo(
    () => columns.filter((col) => !isActionsCol(col)),
    [columns],
  )
  const tabletHideColumns = useMemo(
    () => dataColumns.filter(isTabletHideCol),
    [dataColumns],
  )
  const showExpand = responsive && tabletHideColumns.length > 0
  const colSpan = columns.length + (showExpand ? 1 : 0)

  const titleCol =
    dataColumns.find((c) => c.cardRole === 'title') ||
    dataColumns.find((c) => /\bcol--primary\b/.test(c.className || ''))
  const subtitleCol =
    dataColumns.find((c) => c.cardRole === 'subtitle') ||
    dataColumns.find((c) => /\bcol--secondary\b/.test(c.className || ''))
  const statusCol = dataColumns.find((c) => c.cardRole === 'status')
  const fieldCols = dataColumns.filter(
    (c) => c !== titleCol && c !== subtitleCol && c !== statusCol,
  )

  const toggleRow = (key) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div
      className={cn(
        'data-table-shell',
        fillViewport && 'data-table-shell--fill',
        className,
      )}
      data-responsive-table={responsive || undefined}
      data-table-paginate={showFooter || undefined}
      data-fill-viewport={fillViewport || undefined}
    >
      {toolbar ? <div className="table-toolbar">{toolbar}</div> : null}

      {loading ? (
        <div className="table-loading" data-table-loading>
          <TableSkeleton cols={skeletonCols ?? (columns.length || 5)} rows={skeletonRows} />
          <p className="sr-only" role="status">
            Cargando registros…
          </p>
        </div>
      ) : null}

      {!loading && rows.length === 0 ? (
        <div className="table-empty" data-table-empty>
          <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
        </div>
      ) : null}

      {!loading && rows.length > 0 ? (
        <>
          <div className="table-wrap">
            <table
              className={cn(
                'data-table',
                compact && 'data-table--compact',
                responsive && 'data-table--responsive',
              )}
              data-sortable
            >
              <thead>
                <tr>
                  {showExpand ? (
                    <th className="data-table__expand-col" aria-label="Expandir fila" />
                  ) : null}
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={cn(
                        col.headerClassName ?? col.className,
                        col.sortable && 'is-sortable',
                        sortKey === col.key && 'is-sorted',
                      )}
                      onClick={col.sortable && onSort ? () => onSort(col.key) : undefined}
                      data-card-role={col.cardRole}
                      data-priority={col.priority}
                    >
                      {col.header}
                      {col.sortable ? <SortIcon /> : null}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const rowKey = getRowKey(row, i)
                  const isOpen = !!expanded[rowKey]
                  return (
                    <Fragment key={rowKey}>
                      <tr
                        className={cn(
                          isOpen && 'is-expanded',
                          onRowClick && 'is-clickable',
                        )}
                        onClick={
                          onRowClick
                            ? (e) => {
                                if (e.target.closest('button, a, input, select, textarea, label')) {
                                  return
                                }
                                onRowClick(row, i)
                              }
                            : undefined
                        }
                      >
                        {showExpand ? (
                          <td className="data-table__expand-col">
                            <button
                              type="button"
                              className="data-table__expand-btn"
                              aria-expanded={isOpen}
                              aria-label="Ver más detalles"
                              onClick={() => toggleRow(rowKey)}
                            >
                              <Icon name="chevron" className="icon" size={16} />
                            </button>
                          </td>
                        ) : null}
                        {columns.map((col) => (
                          <td
                            key={col.key}
                            className={cn(
                              col.cellClassName
                                ? typeof col.cellClassName === 'function'
                                  ? col.cellClassName(row)
                                  : col.cellClassName
                                : col.className,
                            )}
                            data-card-role={col.cardRole}
                          >
                            {cellContent(col, row, i)}
                          </td>
                        ))}
                      </tr>
                      {showExpand ? (
                        <tr className="data-table__detail-row">
                          <td colSpan={colSpan}>
                            <div className="data-table__detail-grid">
                              {tabletHideColumns.map((col) => (
                                <div key={col.key} className="data-table__detail-item">
                                  <span className="data-table__detail-label">{col.header}</span>
                                  <span>{cellContent(col, row, i)}</span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          {responsive ? (
            <div
              className="record-list"
              data-record-cards
              aria-label={recordListLabel}
            >
              {rows.map((row, i) => {
                const rowKey = getRowKey(row, i)
                const actions = mobileCardActions?.(row, i)
                return (
                  <article key={rowKey} className="record-card">
                    <div className="record-card__header">
                      <div className="record-card__primary">
                        {titleCol ? (
                          <h3 className="record-card__title">
                            {cellContent(titleCol, row, i)}
                          </h3>
                        ) : null}
                        {subtitleCol ? (
                          <div className="record-card__subtitle">
                            {plainText(cellContent(subtitleCol, row, i)) ||
                              cellContent(subtitleCol, row, i)}
                          </div>
                        ) : null}
                      </div>
                      {statusCol ? (
                        <div className="record-card__status">
                          {cellContent(statusCol, row, i)}
                        </div>
                      ) : null}
                    </div>

                    {fieldCols.length > 0 ? (
                      <div className="record-card__meta">
                        {fieldCols.map((col) => {
                          const value = cellContent(col, row, i)
                          const text = plainText(value)
                          if (!text || text === '—') return null
                          return (
                            <p key={col.key} className="record-card__meta-line">
                              <span className="record-card__meta-label">{col.header} · </span>
                              <span className="record-card__meta-value">{text}</span>
                            </p>
                          )
                        })}
                      </div>
                    ) : null}

                    {actions?.primary || actions?.secondary ? (
                      <div className="record-card__actions">
                        {actions.primary ? (
                          <Button
                            variant="primary"
                            className="record-card__action-primary"
                            onClick={actions.primary.onClick}
                          >
                            {actions.primary.label}
                          </Button>
                        ) : null}
                        {actions.secondary ? (
                          <Button
                            variant="quiet"
                            className="record-card__action-secondary"
                            onClick={actions.secondary.onClick}
                          >
                            {actions.secondary.label}
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                )
              })}
            </div>
          ) : null}
        </>
      ) : null}

      {showFooter ? (
        <div className="table-footer">
          <div className="table-footer__start">
            {onPageSizeChange ? (
              <PageSizeSelector
                id={pageSizeId}
                value={pageSize}
                options={pageSizeOptions}
                onChange={(n) => {
                  onPageSizeChange(n)
                  onPageChange?.(1)
                }}
              />
            ) : null}
            <span className="table-footer__info" data-page-info>
              {pageInfo}
            </span>
          </div>
          <Pagination page={page} pageCount={pageCount} onChange={onPageChange} />
        </div>
      ) : null}
    </div>
  )
}
