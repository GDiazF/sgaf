import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ShowcaseHero, ShowcaseBlock } from '../ShowcaseHero.jsx'
import { DataTable, TableSkeleton } from '../../components/ui/DataTable.jsx'
import { FiltersBar } from '../../components/ui/FiltersBar.jsx'
import { Badge } from '../../components/ui/Badge.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Field, Input, Select } from '../../components/ui/Field.jsx'
import { EmptyState } from '../../components/ui/EmptyState.jsx'
import { Icon } from '../../icons/Icon.jsx'

const PROVIDERS = [
  { id: 1, rut: '76.543.210-K', name: 'Suministros del Norte SpA', rubro: 'Tecnología', status: 'Activo', contact: 'contacto@suminort.cl', hideRubroTablet: true },
  { id: 2, rut: '77.112.890-4', name: 'Oficina Total Ltda.', rubro: 'Mobiliario', status: 'Activo', hideRubroTablet: true },
  { id: 3, rut: '78.901.234-1', name: 'Servicios Integrales Iquique', rubro: 'Servicios', status: 'Pendiente', contact: null, hideRubroTablet: true },
  { id: 4, rut: '79.456.789-0', name: 'Distribuidora Patagonia', rubro: 'Tecnología', status: 'Inactivo', hideRubroTablet: true },
  { id: 5, rut: '80.123.456-7', name: 'Comercial Los Andes', rubro: 'Alimentación', status: 'Activo', hideRubroTablet: true },
  { id: 6, rut: '81.234.567-8', name: 'Transportes del Pacífico', rubro: 'Logística', status: 'Activo', hideRubroTablet: true },
  { id: 7, rut: '82.345.678-9', name: 'Librería Educativa Norte', rubro: 'Educación', status: 'Pendiente', hideRubroTablet: true },
  { id: 8, rut: '83.456.789-0', name: 'Mantención Integral SpA', rubro: 'Servicios', status: 'Activo', hideRubroTablet: true },
  { id: 9, rut: '84.567.890-1', name: 'Equipos Médicos Ltda.', rubro: 'Salud', status: 'Inactivo', hideRubroTablet: false },
  { id: 10, rut: '85.678.901-2', name: 'Construcciones Altiplano', rubro: 'Construcción', status: 'Activo', hideRubroTablet: false },
  { id: 11, rut: '86.789.012-3', name: 'Seguridad Industrial Norte', rubro: 'Servicios', status: 'Activo', hideRubroTablet: true },
  { id: 12, rut: '87.890.123-4', name: 'Papelería Central Iquique', rubro: 'Mobiliario', status: 'Pendiente', hideRubroTablet: true },
]

const COMPACT_ROWS = [
  { id: '#0041', module: 'Impresoras', status: 'OK', updated: '07/07/2026' },
  { id: '#0042', module: 'Teléfonos', status: 'Revisión', updated: '06/07/2026' },
  { id: '#0043', module: 'Reservas', status: 'Error', updated: '05/07/2026' },
]

const badgeVariant = (s) => {
  if (s === 'Activo' || s === 'OK') return 'success'
  if (s === 'Pendiente' || s === 'Revisión') return 'warning'
  if (s === 'Inactivo') return 'neutral'
  if (s === 'Error' || s === 'Rechazado') return 'danger'
  return 'neutral'
}

function StatusBadge({ status }) {
  const withDot = status === 'Activo' || status === 'Pendiente' || status === 'Rechazado'
  return (
    <Badge variant={badgeVariant(status)} dot={withDot}>
      {status}
    </Badge>
  )
}

export function TablesPage() {
  const [mode, setMode] = useState('data') // data | loading | empty
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)

  const columns = useMemo(
    () => [
      {
        key: 'rut',
        header: 'RUT',
        sortable: true,
        cardRole: 'subtitle',
        priority: 1,
        render: (row) => <span className="mono">{row.rut}</span>,
      },
      {
        key: 'name',
        header: 'Razón social',
        sortable: true,
        cardRole: 'title',
        priority: 1,
      },
      {
        key: 'rubro',
        header: 'Rubro',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 2,
        cellClassName: (row) => (row.hideRubroTablet === false ? undefined : 'col--tablet-hide'),
      },
      {
        key: 'status',
        header: 'Estado',
        cardRole: 'status',
        priority: 1,
        render: (row) => <StatusBadge status={row.status} />,
      },
      {
        key: 'actions',
        header: '',
        className: 'col--actions',
        render: () => (
          <div className="data-table__actions">
            <Button variant="outline" size="sm">
              Ver detalle
            </Button>
            <Button variant="outline" size="sm">
              Editar
            </Button>
          </div>
        ),
      },
    ],
    [],
  )

  const visibleRows =
    mode === 'empty'
      ? []
      : PROVIDERS.slice((page - 1) * pageSize, page * pageSize)

  return (
    <>
      <ShowcaseHero
        title="Tablas y listados"
        description={
          <>
            Toolbar, filtros, orden, paginación, badges y estados vacíos. Patrones desktop/tablet en{' '}
            <Link to="/states">Estados operativos</Link>. Usar los controles para alternar entre
            datos, loading y sin resultados.
          </>
        }
      />

      <ShowcaseBlock
        title="Tabla estándar con toolbar"
        rule=".table-toolbar + .table-wrap + .data-table + .table-footer · .page-size (default 50) + paginación · data-sortable en th"
      >
        <div className="showcase-demo-controls">
          <Button size="sm" variant={mode === 'data' ? 'primary' : 'secondary'} onClick={() => setMode('data')}>
            Con datos
          </Button>
          <Button
            size="sm"
            variant={mode === 'loading' ? 'primary' : 'secondary'}
            onClick={() => setMode('loading')}
          >
            Loading
          </Button>
          <Button
            size="sm"
            variant={mode === 'empty' ? 'primary' : 'secondary'}
            onClick={() => setMode('empty')}
          >
            Sin resultados
          </Button>
        </div>

        <FiltersBar
          onSearch={() => {}}
          onClear={() => {}}
          advanced={
            <Field label="Estado" htmlFor="tb-estado">
              <Select id="tb-estado" defaultValue="Todos">
                <option>Todos</option>
                <option>Activo</option>
                <option>Pendiente</option>
              </Select>
            </Field>
          }
        >
          <Field label="Buscar" htmlFor="tb-q">
            <div className="input-wrap">
              <Icon name="search" className="input-wrap__icon" size={16} />
              <Input id="tb-q" type="search" placeholder="RUT, razón social…" />
            </div>
          </Field>
        </FiltersBar>

        <DataTable
          columns={columns}
          rows={visibleRows}
          loading={mode === 'loading'}
          totalCount={mode === 'empty' ? 0 : PROVIDERS.length}
          page={page}
          pageSize={pageSize}
          pageSizeId="showcase-page-size"
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          fillViewport={false}
          emptyTitle="Sin resultados"
          emptyDescription="No hay registros que coincidan con los filtros aplicados."
          emptyAction={
            <Button variant="quiet" onClick={() => setMode('data')}>
              Limpiar filtros
            </Button>
          }
          toolbar={
            <>
              <div className="table-toolbar__left">
                <span className="table-toolbar__title">Proveedores</span>
                <Badge variant="neutral">{PROVIDERS.length} registros</Badge>
              </div>
              <div className="table-toolbar__right">
                <Button variant="secondary" size="sm">
                  Exportar
                </Button>
                <Button variant="primary" size="sm">
                  Crear nuevo
                </Button>
              </div>
            </>
          }
        />
      </ShowcaseBlock>

      <ShowcaseBlock
        title="Tabla compacta"
        rule=".data-table.data-table--compact — densidad extra (el default del sistema ya es acotado)"
      >
        <div className="table-wrap">
          <table className="data-table data-table--compact">
            <thead>
              <tr>
                <th>ID</th>
                <th>Módulo</th>
                <th>Estado</th>
                <th>Actualizado</th>
              </tr>
            </thead>
            <tbody>
              {COMPACT_ROWS.map((r) => (
                <tr key={r.id}>
                  <td className="mono">{r.id}</td>
                  <td>{r.module}</td>
                  <td>
                    <Badge variant={badgeVariant(r.status)}>{r.status}</Badge>
                  </td>
                  <td className="mono">{r.updated}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ShowcaseBlock>

      <ShowcaseBlock
        title="Badges de estado"
        rule=".badge--neutral · accent · success · warning · danger · --dot para indicador"
      >
        <div className="showcase-row">
          <Badge variant="neutral">Inactivo</Badge>
          <Badge variant="accent">En proceso</Badge>
          <Badge variant="success" dot>
            Activo
          </Badge>
          <Badge variant="warning" dot>
            Pendiente
          </Badge>
          <Badge variant="danger" dot>
            Rechazado
          </Badge>
        </div>
      </ShowcaseBlock>

      <ShowcaseBlock
        id="responsive-filters"
        title="Filtros responsive — desktop / tablet / móvil"
        rule=".filters + .filters__search (prioridad) + .filters__toggle (solo móvil) + .filters__advanced colapsable · Buscar = primary · Limpiar = secondary quiet"
      >
        <ul className="showcase-checklist" style={{ marginBottom: 'var(--space-4)' }}>
          <li>
            <strong>Desktop:</strong> búsqueda + filtros avanzados en fila; botones alineados a la
            altura de inputs
          </li>
          <li>
            <strong>Tablet:</strong> mismo patrón con wrap natural
          </li>
          <li>
            <strong>Móvil:</strong> búsqueda → toggle avanzados → botones; sin flex stretch ni
            huecos; padding lateral topbar ≥20px
          </li>
        </ul>
        <FiltersBar
          onSearch={() => {}}
          onClear={() => {}}
          advanced={
            <>
              <Field label="Estado" htmlFor="demo-estado">
                <Select id="demo-estado" defaultValue="Todos">
                  <option>Todos</option>
                  <option>Activo</option>
                </Select>
              </Field>
              <Field label="Rubro" htmlFor="demo-rubro">
                <Select id="demo-rubro" defaultValue="Todos">
                  <option>Todos</option>
                  <option>Tecnología</option>
                </Select>
              </Field>
            </>
          }
        >
          <Field label="Buscar" htmlFor="demo-q">
            <div className="input-wrap">
              <Icon name="search" className="input-wrap__icon" size={16} />
              <Input id="demo-q" type="search" placeholder="Razón social, RUT…" />
            </div>
          </Field>
        </FiltersBar>
      </ShowcaseBlock>

      <ShowcaseBlock
        id="responsive-cards"
        title="Listado móvil — .record-card"
        rule="Ficha resumida: título + RUT + badge · metadatos en líneas compactas (Rubro · Contacto) · Ver detalle primary + Editar secondary quiet"
      >
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', marginBottom: 'var(--space-4)' }}>
          Ejemplo estático del patrón generado automáticamente en ≤767px. Sin scroll horizontal.
        </p>
        <div className="record-list" style={{ display: 'flex', maxWidth: 420 }}>
          <article className="record-card">
            <div className="record-card__header">
              <div className="record-card__primary">
                <h3 className="record-card__title">Suministros del Norte SpA</h3>
                <div className="record-card__subtitle">76.543.210-K</div>
              </div>
              <div className="record-card__status">
                <Badge variant="success" dot>
                  Activo
                </Badge>
              </div>
            </div>
            <div className="record-card__meta">
              <p className="record-card__meta-line">
                <span className="record-card__meta-label">Rubro · </span>
                <span className="record-card__meta-value">Tecnología</span>
              </p>
              <p className="record-card__meta-line">
                <span className="record-card__meta-label">Contacto · </span>
                <span className="record-card__meta-value">contacto@suminort.cl</span>
              </p>
            </div>
            <div className="record-card__actions">
              <Button variant="primary" className="record-card__action-primary">
                Ver detalle
              </Button>
              <Button variant="quiet" className="record-card__action-secondary">
                Editar
              </Button>
            </div>
          </article>
          <article className="record-card">
            <div className="record-card__header">
              <div className="record-card__primary">
                <h3 className="record-card__title">Servicios Integrales Iquique</h3>
                <div className="record-card__subtitle">78.901.234-1</div>
              </div>
              <div className="record-card__status">
                <Badge variant="warning" dot>
                  Pendiente
                </Badge>
              </div>
            </div>
            <div className="record-card__meta">
              <p className="record-card__meta-line">
                <span className="record-card__meta-label">Rubro · </span>
                <span className="record-card__meta-value">Servicios generales</span>
              </p>
            </div>
            <div className="record-card__actions">
              <Button variant="primary" className="record-card__action-primary">
                Ver detalle
              </Button>
              <Button variant="quiet" className="record-card__action-secondary">
                Editar
              </Button>
            </div>
          </article>
        </div>
      </ShowcaseBlock>

      <ShowcaseBlock
        id="responsive-table"
        title="Tabla responsive — desktop / tablet / móvil"
        rule="[data-responsive-table] · Desktop: tabla completa · Tablet: .col--tablet-hide + fila expandible · Móvil: .record-list oculta .table-wrap y muestra cards (sin thead ni scroll horizontal)"
      >
        <ul className="showcase-checklist" style={{ marginBottom: 'var(--space-4)' }}>
          <li>
            <strong>≥1024px:</strong> todas las columnas visibles, sin scroll horizontal forzado
          </li>
          <li>
            <strong>768–1023px:</strong> columnas secundarias ocultas; botón expandir fila para ver
            Rubro y más
          </li>
          <li>
            <strong>≤767px:</strong> tabla oculta; cada registro es una tarjeta (.record-card) con
            acciones accesibles
          </li>
          <li>Scroll horizontal solo como último recurso — no es la estrategia principal</li>
        </ul>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>
          Redimensiona el visor para comparar los tres modos. La tabla de arriba ya usa este patrón.
        </p>
      </ShowcaseBlock>

      <ShowcaseBlock
        title="Empty state (tabla vacía)"
        rule=".empty-state dentro de .table-empty — primer uso del módulo sin registros"
      >
        <div className="table-wrap">
          <div className="table-empty">
            <EmptyState
              icon={
                <svg
                  className="empty-state__icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  aria-hidden
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M3 9h18" />
                </svg>
              }
              title="No hay proveedores registrados"
              description="Comience creando el primer proveedor del directorio institucional."
              action={
                <Button variant="primary" size="sm">
                  Crear nuevo
                </Button>
              }
            />
          </div>
        </div>
      </ShowcaseBlock>

      <ShowcaseBlock
        title="Skeleton loading (tabla)"
        rule={
          <>
            barras <code>.skeleton--row</code> en <code>.table-loading</code> — ver también{' '}
            <Link to="/states">Estados operativos</Link>
          </>
        }
      >
        <div className="table-loading" style={{ minHeight: 'auto' }}>
          <TableSkeleton rows={5} />
        </div>
      </ShowcaseBlock>
    </>
  )
}
