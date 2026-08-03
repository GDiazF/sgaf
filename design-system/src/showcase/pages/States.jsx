import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ShowcaseHero, ShowcaseBlock } from '../ShowcaseHero.jsx'
import {
  EmptyState,
  PermissionBlock,
  ActionBlock,
} from '../../components/ui/EmptyState.jsx'
import { TableSkeleton } from '../../components/ui/DataTable.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Badge } from '../../components/ui/Badge.jsx'
import { Modal, ConfirmModal, Drawer } from '../../components/ui/Modal.jsx'
import { Field, Input, Select } from '../../components/ui/Field.jsx'
import { useToast } from '../../components/ui/Toast.jsx'
import { Icon } from '../../icons/Icon.jsx'
import { cn } from '../../lib/cn.js'

const COL_SPEC = [
  ['Selección', '.col--select', 'Checkbox fila / seleccionar todos'],
  ['Principal', '.col--primary', 'Razón social, nombre del registro'],
  ['Secundaria', '.col--secondary', 'RUT, metadata menos prioritaria'],
  ['Estado', '.col--status', 'Badge con ancho fijo'],
  ['Tablet hide', '.col--tablet-hide', 'Oculta en 768–1023px'],
  ['Acciones', '.col--actions', 'Ver / Editar — visibles al hover'],
]

export function StatesPage() {
  const { showToast } = useToast()
  const [confirm, setConfirm] = useState(false)
  const [modal, setModal] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const [expanded, setExpanded] = useState(false)

  return (
    <>
      <ShowcaseHero
        title="Estados operativos del sistema"
        description="Tablas desktop/tablet, empty states, skeleton, feedback transversal y acciones sensibles. Patrones reutilizables para operación real — no solo estados ideales."
      />

      <ShowcaseBlock
        id="table-desktop"
        title="Tabla administrativa — desktop (≥1024px)"
        rule=".data-table · columnas normadas · selección · orden · acciones por fila · paginación"
      >
        <div className="ds-table-wrap" style={{ overflowX: 'auto', marginBottom: 'var(--space-4)' }}>
          <table className="ds-table" style={{ width: '100%', fontSize: 'var(--text-sm)', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left' }}>
                <th style={{ padding: 'var(--space-2)' }}>Columna</th>
                <th>Clase</th>
                <th>Uso</th>
              </tr>
            </thead>
            <tbody>
              {COL_SPEC.map(([col, cls, use]) => (
                <tr key={cls}>
                  <td style={{ padding: 'var(--space-2)' }}>{col}</td>
                  <td>
                    <code>{cls}</code>
                  </td>
                  <td>{use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="table-wrap">
          <table className="data-table data-table--selectable" data-sortable>
            <thead>
              <tr>
                <th className="col--select">
                  <input type="checkbox" className="no-global" aria-label="Seleccionar todos" />
                </th>
                <th className="is-sortable col--primary">Razón social</th>
                <th className="is-sortable col--secondary">RUT</th>
                <th className="col--status">Estado</th>
                <th>Rubro</th>
                <th className="col--actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="data-table__select-cell">
                  <input type="checkbox" className="no-global" aria-label="Seleccionar" />
                </td>
                <td>Distribuidora Norte SpA</td>
                <td className="mono">76.543.210-K</td>
                <td>
                  <Badge variant="success" dot>
                    Activo
                  </Badge>
                </td>
                <td>Tecnología</td>
                <td>
                  <div className="data-table__actions">
                    <Button variant="outline" size="sm">
                      Ver
                    </Button>
                    <Button variant="ghost" size="sm">
                      Editar
                    </Button>
                  </div>
                </td>
              </tr>
              <tr>
                <td className="data-table__select-cell">
                  <input type="checkbox" className="no-global" aria-label="Seleccionar" />
                </td>
                <td>Servicios Integrales Iquique</td>
                <td className="mono">78.901.234-1</td>
                <td>
                  <Badge variant="warning" dot>
                    Pendiente
                  </Badge>
                </td>
                <td>Servicios generales</td>
                <td>
                  <div className="data-table__actions">
                    <Button variant="outline" size="sm">
                      Ver
                    </Button>
                    <Button variant="ghost" size="sm">
                      Editar
                    </Button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </ShowcaseBlock>

      <ShowcaseBlock
        id="table-tablet"
        title="Tabla administrativa — tablet (768–1023px)"
        rule=".data-table--responsive · .col--tablet-hide · fila expandible · sin scroll horizontal como estrategia principal"
      >
        <p
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--muted)',
            marginBottom: 'var(--space-4)',
            maxWidth: '62ch',
          }}
        >
          Redimensiona el visor a tablet o revisa la tabla interactiva en{' '}
          <Link to="/tables">Tablas y listados</Link>. Columnas secundarias se ocultan; detalle en fila
          expandible.
        </p>
        <div className="table-wrap" style={{ maxWidth: 820 }}>
          <table className="data-table data-table--responsive">
            <thead>
              <tr>
                <th className="data-table__expand-col" aria-hidden="true" />
                <th className="col--primary">Razón social</th>
                <th className="col--secondary">RUT</th>
                <th className="col--status">Estado</th>
                <th className="col--tablet-hide">Rubro</th>
                <th className="col--actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr className={cn(expanded && 'is-expanded')}>
                <td className="data-table__expand-col">
                  <button
                    type="button"
                    className="data-table__expand-btn"
                    aria-expanded={expanded}
                    aria-label="Ver más"
                    onClick={() => setExpanded((v) => !v)}
                  >
                    <Icon name="chevron" className="icon" size={16} />
                  </button>
                </td>
                <td>Distribuidora Norte SpA</td>
                <td className="mono">76.543.210-K</td>
                <td>
                  <Badge variant="success" dot>
                    Activo
                  </Badge>
                </td>
                <td className="col--tablet-hide">Tecnología</td>
                <td>
                  <div className="data-table__actions">
                    <Button variant="outline" size="sm">
                      Ver
                    </Button>
                  </div>
                </td>
              </tr>
              <tr className="data-table__detail-row">
                <td colSpan={6}>
                  <div className="data-table__detail-grid">
                    <div className="data-table__detail-item">
                      <span className="data-table__detail-label">Rubro</span>
                      <span>Tecnología</span>
                    </div>
                    <div className="data-table__detail-item">
                      <span className="data-table__detail-label">Contacto</span>
                      <span>contacto@ejemplo.cl</span>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', marginTop: 'var(--space-3)' }}>
          Móvil (≤767px): ver <Link to="/tables#responsive-cards">cards por registro</Link> — patrón
          separado, sin tabla visible.
        </p>
      </ShowcaseBlock>

      <ShowcaseBlock
        id="empty-states"
        title="Empty states — variantes normadas"
        rule=".empty-state · --compact · --inline · --widget · --access"
      >
        <div className="showcase-grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))' }}>
          <div className="card" style={{ padding: 'var(--space-4)' }}>
            <p
              style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--primary-text)',
                marginBottom: 'var(--space-3)',
              }}
            >
              Sin datos (módulo)
            </p>
            <EmptyState
              variant="compact"
              icon={
                <svg className="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M3 9h18" />
                </svg>
              }
              title="No hay proveedores"
              description="Comience creando el primer registro."
              action={
                <Button variant="primary" size="sm">
                  Crear nuevo
                </Button>
              }
            />
          </div>
          <div className="card" style={{ padding: 'var(--space-4)' }}>
            <p
              style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--primary-text)',
                marginBottom: 'var(--space-3)',
              }}
            >
              Sin resultados (búsqueda)
            </p>
            <EmptyState
              variant="compact"
              icon={
                <svg className="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
              }
              title="Sin resultados"
              description="Pruebe con otros filtros o términos."
              action={
                <Button variant="quiet" size="sm">
                  Limpiar filtros
                </Button>
              }
            />
          </div>
          <div className="card" style={{ padding: 'var(--space-4)' }}>
            <p
              style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--primary-text)',
                marginBottom: 'var(--space-3)',
              }}
            >
              Widget vacío
            </p>
            <EmptyState
              variant="widget"
              icon={
                <svg className="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6" />
                </svg>
              }
              title="Sin novedades"
              description="No hay comunicados publicados."
            />
          </div>
          <div className="card" style={{ padding: 'var(--space-4)' }}>
            <p
              style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--primary-text)',
                marginBottom: 'var(--space-3)',
              }}
            >
              Sin acceso
            </p>
            <EmptyState
              variant="access"
              className="empty-state--compact"
              icon={
                <svg className="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              }
              title="Acceso restringido"
              description="No tiene permisos para ver este módulo."
            />
          </div>
        </div>
      </ShowcaseBlock>

      <ShowcaseBlock
        id="skeleton"
        title="Loading y skeleton"
        rule=".skeleton-table--bars · .skeleton--row — barras horizontales"
      >
        <div className="showcase-grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))' }}>
          <div>
            <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--muted)' }}>
              Tabla
            </p>
            <TableSkeleton rows={5} />
          </div>
          <div>
            <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--muted)' }}>
              Formulario
            </p>
            <div className="skeleton-form">
              <div className="skeleton skeleton--label" />
              <div className="skeleton skeleton--field" />
              <div className="skeleton skeleton--label" />
              <div className="skeleton skeleton--field" />
            </div>
          </div>
          <div>
            <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--muted)' }}>
              Widget KPI
            </p>
            <div className="skeleton-widget">
              <div className="skeleton skeleton--text" />
              <div className="skeleton skeleton--title" />
            </div>
          </div>
        </div>
      </ShowcaseBlock>

      <ShowcaseBlock
        id="feedback"
        title="Feedback del sistema"
        rule=".system-banner · .alert · toast post-acción · .form-status"
      >
        <div className="showcase-col" style={{ gap: 'var(--space-3)' }}>
          <div className="system-banner system-banner--success">
            <div className="system-banner__body">
              <div className="system-banner__title">Exportación completada</div>
              El archivo se descargó correctamente.
            </div>
          </div>
          <div className="system-banner system-banner--error">
            <div className="system-banner__body">
              <div className="system-banner__title">Error al guardar</div>
              No se pudo conectar con el servidor. Intente nuevamente.
            </div>
            <Button variant="secondary" size="sm" className="system-banner__action">
              Reintentar
            </Button>
          </div>
          <div className="system-banner system-banner--warning">
            <div className="system-banner__body">
              <div className="system-banner__title">Cambios sin guardar</div>
              Hay modificaciones pendientes en este formulario.
            </div>
          </div>
          <div className="system-banner system-banner--info">
            <div className="system-banner__body">
              <div className="system-banner__title">Mantenimiento programado</div>
              El módulo estará en mantenimiento hoy 22:00–23:00 hrs.
            </div>
          </div>
          <div className="form-status form-status--success" role="status">
            <strong>Guardado exitoso.</strong> El establecimiento fue registrado correctamente.
          </div>
        </div>
        <div className="showcase-row" style={{ marginTop: 'var(--space-4)' }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              showToast('El registro fue eliminado.', { variant: 'success', title: 'Eliminado' })
            }
          >
            Toast post-acción
          </Button>
        </div>
      </ShowcaseBlock>

      <ShowcaseBlock
        id="sensitive"
        title="Acciones sensibles y permisos"
        rule=".action-block + .action-hint · .permission-block · confirm dialog"
      >
        <div className="showcase-grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))' }}>
          <div className="card" style={{ padding: 'var(--space-4)' }}>
            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>
              Eliminar deshabilitado
            </p>
            <ActionBlock hint="No puede eliminar registros con movimientos asociados.">
              <Button variant="danger" disabled>
                Eliminar
              </Button>
            </ActionBlock>
          </div>
          <div className="card" style={{ padding: 'var(--space-4)' }}>
            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>
              Exportar bloqueado
            </p>
            <ActionBlock
              className="action-block--inline"
              hint="Requiere rol de administrador del módulo."
              hintVariant={null}
            >
              <Button variant="quiet" disabled>
                Exportar
              </Button>
            </ActionBlock>
          </div>
          <div className="card" style={{ padding: 'var(--space-4)' }}>
            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>
              Confirmación eliminar
            </p>
            <Button variant="danger" size="sm" onClick={() => setConfirm(true)}>
              Abrir confirm dialog
            </Button>
          </div>
        </div>
        <PermissionBlock
          style={{ marginTop: 'var(--space-4)' }}
          title="Permisos insuficientes"
          description="Su perfil no incluye acceso al módulo de compras. Contacte al administrador del sistema si necesita habilitación."
        />
      </ShowcaseBlock>

      <ShowcaseBlock
        id="overlays"
        title="Modal y drawer — responsive"
        rule="Desktop: centrado · Móvil: modal sheet inferior · Drawer ancho completo"
      >
        <div className="showcase-row">
          <Button variant="secondary" size="sm" onClick={() => setModal(true)}>
            Modal edición
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setDrawer(true)}>
            Drawer filtros
          </Button>
        </div>
        <p
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--muted)',
            marginTop: 'var(--space-3)',
            maxWidth: '58ch',
          }}
        >
          En móvil (≤767px), el modal se presenta como sheet desde abajo; el drawer ocupa el ancho
          completo. Footer con botones apilados: primario arriba.
        </p>
      </ShowcaseBlock>

      <ConfirmModal
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false)
          showToast('Registro eliminado correctamente.', {
            variant: 'success',
            title: 'Eliminado',
          })
        }}
        variant="confirm"
        title="Confirmar eliminación"
        description="¿Está seguro de eliminar este proveedor? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
      />

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Edición rápida"
        labelledBy="ops-modal-title"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={() => setModal(false)}>
              Guardar
            </Button>
          </>
        }
      >
        <Field label="Razón social" htmlFor="ops-nombre">
          <Input id="ops-nombre" defaultValue="Distribuidora Norte SpA" />
        </Field>
      </Modal>

      <Drawer
        open={drawer}
        onClose={() => setDrawer(false)}
        title="Filtros avanzados"
        footer={
          <>
            <Button variant="quiet" onClick={() => setDrawer(false)}>
              Limpiar filtros
            </Button>
            <Button variant="primary" onClick={() => setDrawer(false)}>
              Buscar
            </Button>
          </>
        }
      >
        <Field label="Estado">
          <Select defaultValue="Todos">
            <option>Todos</option>
            <option>Activo</option>
          </Select>
        </Field>
      </Drawer>
    </>
  )
}
