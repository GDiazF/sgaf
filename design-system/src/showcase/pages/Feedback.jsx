import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ShowcaseHero, ShowcaseBlock } from '../ShowcaseHero.jsx'
import { Alert } from '../../components/ui/Alert.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Modal, ConfirmModal, Drawer } from '../../components/ui/Modal.jsx'
import { useToast } from '../../components/ui/Toast.jsx'
import { FormOverlay } from '../../components/ui/FormOverlay.jsx'
import { EmptyState, PermissionBlock, ActionBlock } from '../../components/ui/EmptyState.jsx'
import { NotificationBell } from '../../layouts/AppShell.jsx'
import { Field, Select, Input } from '../../components/ui/Field.jsx'
import { Badge } from '../../components/ui/Badge.jsx'
import { Icon } from '../../icons/Icon.jsx'

export function FeedbackPage() {
  const { showToast } = useToast()
  const [modal, setModal] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const [notifOpen, setNotifOpen] = useState(true)
  const [reserva, setReserva] = useState(null) // detail | pending | confirm
  const [overlayStatus, setOverlayStatus] = useState(null) // null | loading | success | error
  const [overlayDesc, setOverlayDesc] = useState('')
  const [demoNombre, setDemoNombre] = useState('Escuela Ejemplo')

  const runOverlayDemo = (outcome) => {
    setOverlayDesc('')
    setOverlayStatus('loading')
    window.setTimeout(() => {
      if (outcome === 'success') {
        setOverlayDesc('Los cambios ya están disponibles en el listado.')
        setOverlayStatus('success')
      } else {
        setOverlayDesc('RBD: este valor ya existe.\nNombre: campo obligatorio.')
        setOverlayStatus('error')
      }
    }, 1400)
  }

  return (
    <>
      <ShowcaseHero
        title="Overlays y feedback"
        description="Alertas inline, toasts, modales, drawer, confirmación, skeleton y empty states. Usar los botones para probar interacciones."
      />

      <ShowcaseBlock
        title="Alertas inline"
        rule=".alert--info · success · warning · danger — mensajes persistentes en contexto de página"
      >
        <div className="showcase-col" style={{ gap: 'var(--space-3)' }}>
          <Alert variant="info" title="Información">
            <p>El módulo se actualizará esta noche entre 22:00 y 23:00 hrs.</p>
          </Alert>
          <Alert variant="success" title="Operación exitosa">
            <p>El proveedor fue registrado correctamente.</p>
          </Alert>
          <Alert variant="warning" title="Atención">
            <p>Hay 3 contratos próximos a vencer en los próximos 30 días.</p>
          </Alert>
          <Alert variant="danger" title="Error de validación">
            <p>No se pudo completar la operación. Revise los campos marcados.</p>
          </Alert>
        </div>
      </ShowcaseBlock>

      <ShowcaseBlock
        title="Toast notifications"
        rule="showToast() · .toast--info · success · error — feedback transitorio post-acción"
      >
        <div className="showcase-row">
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              showToast('Cambios guardados en borrador.', { variant: 'info', title: 'Información' })
            }
          >
            Info
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              showToast('Registro actualizado correctamente.', {
                variant: 'success',
                title: 'Guardado',
              })
            }
          >
            Success
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              showToast('No se pudo conectar con el servidor.', { variant: 'error', title: 'Error' })
            }
          >
            Error
          </Button>
        </div>
      </ShowcaseBlock>

      <ShowcaseBlock
        title="Form overlay — envío en contexto"
        rule=".form-overlay-host · .form-overlay--loading · --success · --error — prueba antes de adoptar global"
      >
        <p style={{ margin: '0 0 var(--space-3)', color: 'var(--muted)', fontSize: 'var(--text-sm)' }}>
          Arco azul (botón primary) que se dibuja desde una pastilla hasta casi cerrar el círculo, con
          punto al centro. Al terminar: verde + ✓ o rojo + ✕ con el motivo del error.
        </p>
        <FormOverlay
          status={overlayStatus}
          description={overlayDesc}
          onDismiss={() => {
            setOverlayStatus(null)
            setOverlayDesc('')
          }}
        >
          <div
            className="form-grid"
            style={{
              padding: 'var(--space-4)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--surface)',
              minHeight: '18rem',
            }}
          >
            <Field label="Nombre" htmlFor="overlay-demo-nombre" required>
              <Input
                id="overlay-demo-nombre"
                className="no-global"
                value={demoNombre}
                onChange={(e) => setDemoNombre(e.target.value)}
                disabled={Boolean(overlayStatus)}
              />
            </Field>
            <Field label="RBD" htmlFor="overlay-demo-rbd">
              <Input
                id="overlay-demo-rbd"
                className="no-global"
                defaultValue="12345"
                disabled={Boolean(overlayStatus)}
              />
            </Field>
            <div
              className="field field--full"
              style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}
            >
              <Button
                variant="primary"
                size="sm"
                disabled={Boolean(overlayStatus)}
                onClick={() => runOverlayDemo('success')}
              >
                Simular guardado OK
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={Boolean(overlayStatus)}
                onClick={() => runOverlayDemo('error')}
              >
                Simular error
              </Button>
            </div>
          </div>
        </FormOverlay>
      </ShowcaseBlock>

      <ShowcaseBlock
        title="Campana y panel de notificaciones"
        rule=".notif-trigger · .notif-btn · .notif-panel · .notif-backdrop — popover contextual anclado a la campana en todos los breakpoints"
      >
        <div className="component-spec">
          <div className="component-spec__anatomy">
            <div className="component-spec__part">
              <strong>notif-btn</strong>Campana · 44×44 en móvil · estados hover/focus/active
            </div>
            <div className="component-spec__part">
              <strong>notif-btn__badge</strong>Contador numérico · máx. 99+
            </div>
            <div className="component-spec__part">
              <strong>notif-panel</strong>Popover anclado al trigger · máx. 360px · orientación auto
              (abajo/arriba)
            </div>
            <div className="component-spec__part">
              <strong>notif-backdrop</strong>Overlay ligero (18% opacidad) solo tablet/móvil · debajo
              del panel
            </div>
          </div>
          <div className="component-spec__states">
            <span className="component-spec__state">default</span>
            <span className="component-spec__state">hover</span>
            <span className="component-spec__state">focus</span>
            <span className="component-spec__state">active (panel abierto)</span>
            <span className="component-spec__state">empty</span>
          </div>
          <p
            style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--muted)',
              marginTop: 'var(--space-3)',
              maxWidth: '62ch',
              lineHeight: 1.55,
            }}
          >
            <strong>Regla responsive (v3.3):</strong> En todos los tamaños el panel es un popover
            contextual anclado a la campana (bottom-end). En tablet/móvil se posiciona respecto al
            trigger y usa backdrop suave — sin bottom sheet ni modal pesado. Si no cabe debajo, abre
            hacia arriba. Cierre: clic fuera, Escape, × o segundo clic en campana.
          </p>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 'var(--space-8)',
              flexWrap: 'wrap',
              marginTop: 'var(--space-4)',
              padding: 'var(--space-4)',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <NotificationBell count={3} open={notifOpen} onToggle={() => setNotifOpen((v) => !v)}>
              <div className="notif-panel__header">
                <span className="notif-panel__title">Notificaciones</span>
                <button type="button" className="notif-panel__action">
                  Marcar leídas
                </button>
              </div>
              <ul className="notif-panel__list">
                <li>
                  <a href="#notif-example" className="notif-panel__item is-unread">
                    <span className="notif-panel__item-body">
                      <div className="notif-panel__item-title">Ejemplo sin leer</div>
                      <div className="notif-panel__item-desc">Item del panel normado.</div>
                    </span>
                    <span className="notif-panel__item-time">Ahora</span>
                  </a>
                </li>
              </ul>
              <div className="notif-panel__footer">
                <a href="#ver-todas">Ver todas</a>
              </div>
            </NotificationBell>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', maxWidth: '28ch' }}>
              Vista estática desktop. Para probar el anclaje móvil, abra{' '}
              <Link to="/navigation">Navegación</Link> y reduzca el ancho a ≤767px.
            </div>
          </div>
        </div>
      </ShowcaseBlock>

      <ShowcaseBlock
        title="Notificaciones — patrones responsive"
        rule="Validar anclaje a la campana · backdrop ligero · panel siempre por encima del overlay"
      >
        <div className="showcase-grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))' }}>
          <div className="card" style={{ padding: 'var(--space-4)' }}>
            <div
              style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--primary-text)',
                marginBottom: 'var(--space-2)',
              }}
            >
              Desktop ≥1024
            </div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', lineHeight: 1.5 }}>
              Popover 360px anclado bajo la campana. Sin backdrop.
            </p>
          </div>
          <div className="card" style={{ padding: 'var(--space-4)' }}>
            <div
              style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--primary-text)',
                marginBottom: 'var(--space-2)',
              }}
            >
              Tablet 768–1023
            </div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', lineHeight: 1.5 }}>
              Mismo popover contextual, posicionado respecto al trigger. Backdrop suave. Botón ×.
            </p>
          </div>
          <div className="card" style={{ padding: 'var(--space-4)' }}>
            <div
              style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--primary-text)',
                marginBottom: 'var(--space-2)',
              }}
            >
              Móvil ≤767
            </div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', lineHeight: 1.5 }}>
              Popover compacto anclado a la campana (no bottom sheet). Si no cabe abajo, abre arriba.
              Overlay ligero.
            </p>
          </div>
        </div>
      </ShowcaseBlock>

      <ShowcaseBlock
        title="Adjuntar archivo"
        rule=".file-input__zone (arrastrar) · .file-input__button (inline) · estados error/success/disabled"
      >
        <div className="component-spec">
          <div className="component-spec__anatomy">
            <div className="component-spec__part">
              <strong>label</strong>Texto del campo
            </div>
            <div className="component-spec__part">
              <strong>zone / button</strong>Área de interacción
            </div>
            <div className="component-spec__part">
              <strong>file-input__name</strong>Nombre del archivo seleccionado
            </div>
            <div className="component-spec__part">
              <strong>hint</strong>Formatos y límites
            </div>
          </div>
          <div className="showcase-grid" style={{ marginTop: 'var(--space-4)' }}>
            <Field label="Zona de carga">
              <div className="file-input">
                <label className="file-input__zone">
                  <Icon name="upload" className="icon icon--lg" size={22} style={{ color: 'var(--muted)' }} />
                  <span className="file-input__label">Arrastre archivos o haga clic</span>
                  <span className="file-input__hint">PDF, DOC · máx. 5 MB</span>
                  <input type="file" className="no-global" />
                </label>
                <span className="file-input__name" />
              </div>
            </Field>
            <Field label="Botón adjuntar">
              <div className="file-input">
                <label className="file-input__button">
                  <Icon name="attach" className="icon" size={16} />
                  Adjuntar archivo
                  <input type="file" className="no-global" />
                </label>
                <span className="file-input__name" />
              </div>
            </Field>
            <Field label="Estado error" className="field--error">
              <div className="file-input is-error">
                <label className="file-input__button">
                  <Icon name="attach" className="icon" size={16} />
                  Reintentar
                  <input type="file" className="no-global" disabled />
                </label>
                <span className="field__error">Formato no permitido</span>
              </div>
            </Field>
          </div>
        </div>
      </ShowcaseBlock>

      <ShowcaseBlock
        title="Banners del sistema"
        rule={
          <>
            .system-banner--info · success · warning · error — feedback post-acción global o
            contextual. Ver <Link to="/states">Estados operativos</Link>
          </>
        }
      >
        <div className="showcase-col" style={{ gap: 'var(--space-3)' }}>
          <div className="system-banner system-banner--success">
            <div className="system-banner__body">
              <div className="system-banner__title">Importación completada</div>
              12 registros fueron procesados correctamente.
            </div>
          </div>
          <div className="system-banner system-banner--error">
            <div className="system-banner__body">
              <div className="system-banner__title">Error al exportar</div>
              No se pudo generar el archivo. Verifique su conexión.
            </div>
            <Button variant="secondary" size="sm" className="system-banner__action">
              Reintentar
            </Button>
          </div>
        </div>
      </ShowcaseBlock>

      <ShowcaseBlock
        title="Acciones sensibles"
        rule={
          <>
            .action-block + .action-hint · .permission-block — ver{' '}
            <Link to="/states">Estados operativos</Link>
          </>
        }
      >
        <ActionBlock
          hint="Seleccione al menos un registro sin movimientos asociados."
          style={{ marginBottom: 'var(--space-4)' }}
        >
          <Button variant="danger" disabled>
            Eliminar seleccionados
          </Button>
        </ActionBlock>
        <PermissionBlock />
      </ShowcaseBlock>

      <ShowcaseBlock title="Modal · drawer · toast — anatomía" rule="Overlays normados · acciones semánticas en footer">
        <div className="component-spec__anatomy" style={{ marginBottom: 'var(--space-4)' }}>
          <div className="component-spec__part">
            <strong>modal</strong>header + body + footer · sm/lg/confirm
          </div>
          <div className="component-spec__part">
            <strong>drawer</strong>panel lateral · filtros/detalle
          </div>
          <div className="component-spec__part">
            <strong>toast</strong>transitorio · info/success/error/warning
          </div>
        </div>
        <div className="component-spec__states" style={{ marginBottom: 'var(--space-4)' }}>
          <span className="component-spec__state">default</span>
          <span className="component-spec__state">open</span>
          <span className="component-spec__state">loading</span>
          <span className="component-spec__state">confirm</span>
        </div>
        <div className="showcase-row">
          <Button variant="secondary" size="sm" onClick={() => setModal(true)}>
            Modal
          </Button>
          <Button variant="danger" size="sm" onClick={() => setConfirm(true)}>
            Confirm dialog
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setDrawer(true)}>
            Drawer
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              showToast('Registro actualizado.', { variant: 'success', title: 'Guardado' })
            }
          >
            Toast
          </Button>
        </div>
      </ShowcaseBlock>

      <ShowcaseBlock
        title="Modales de reserva — calendario"
        rule="Anatomía unificada · variantes según estado · confirm dialogs separados"
      >
        <div className="component-spec" style={{ marginBottom: 'var(--space-4)' }}>
          <div className="component-spec__anatomy">
            <div className="component-spec__part">
              <strong>ModalReservaDetalle</strong>Agendada · footer derecha: Cerrar (ghost) → Editar
              (outline) → Cancelar reserva (<code>danger</code> sólido)
            </div>
            <div className="component-spec__part">
              <strong>ModalReservaAprobacion</strong>Pendiente · footer split: Cancelar mi reserva (
              <code>ghost danger</code>) | Rechazar (<code>danger-outline</code>) + Aprobar (primary)
            </div>
            <div className="component-spec__part">
              <strong>ModalReservaConfirmacion</strong>Cancelar / Rechazar / Eliminar ·{' '}
              <code>danger</code> sólido en confirm · .modal--confirm del sistema
            </div>
          </div>
          <p
            style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--muted)',
              marginTop: 'var(--space-3)',
              maxWidth: '68ch',
              lineHeight: 1.55,
            }}
          >
            Misma anatomía en todos: header → subheader → body → footer normado. Todas las acciones
            danger usan <code>var(--danger)</code> — jerarquía por variante (sólido / outline / text).
            Solo una acción sólida danger por modal.
          </p>
        </div>
        <div className="showcase-row">
          <Button variant="secondary" size="sm" onClick={() => setReserva('detail')}>
            ModalReservaDetalle
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setReserva('pending')}>
            ModalReservaAprobacion
          </Button>
          <Button variant="danger" size="sm" onClick={() => setReserva('confirm')}>
            ModalReservaConfirmacion
          </Button>
        </div>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', marginTop: 'var(--space-3)' }}>
          Composición real del calendario en OpenDesign (<code>reservas.html</code>).
        </p>
      </ShowcaseBlock>

      <ShowcaseBlock
        title="ModalNuevaReserva"
        rule="Solicitud de uso de recurso · choice cards · validación · toast de éxito"
      >
        <div className="component-spec" style={{ marginBottom: 'var(--space-4)' }}>
          <div className="component-spec__anatomy">
            <div className="component-spec__part">
              <strong>Header</strong>Título + subtítulo muted · fondo <code>--surface</code> · borde
              inferior
            </div>
            <div className="component-spec__part">
              <strong>Body</strong>Tipo (choice cards) → Recursos → campos normados
            </div>
            <div className="component-spec__part">
              <strong>Footer</strong>Cancelar (<code>ghost</code>) + Enviar solicitud (
              <code>primary</code>) · loading en submit
            </div>
            <div className="component-spec__part">
              <strong>Apertura</strong>Desktop: botón header · Tablet/móvil: FAB <code>+</code>
            </div>
          </div>
        </div>
        <div className="showcase-row">
          <Button
            variant="primary"
            size="sm"
            onClick={() =>
              showToast('Solicitud enviada correctamente.', {
                variant: 'success',
                title: 'Reserva enviada',
              })
            }
          >
            Demo toast post-envío
          </Button>
        </div>
        <p
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--muted)',
            marginTop: 'var(--space-3)',
            maxWidth: '68ch',
            lineHeight: 1.55,
          }}
        >
          Estados: default (Salas + Coposa) · validación <code>.field--error</code> ·{' '}
          <code>.btn.is-loading</code> · toast success post-envío.
        </p>
      </ShowcaseBlock>

      <ShowcaseBlock
        title="Skeleton loading"
        rule=".skeleton--title · --text · --row · --avatar — placeholder durante carga"
      >
        <div className="card" style={{ padding: 'var(--space-5)', maxWidth: 480 }}>
          <div className="skeleton skeleton--avatar"></div>
          <div className="skeleton skeleton--title"></div>
          <div className="skeleton skeleton--text"></div>
          <div className="skeleton skeleton--text" style={{ width: '80%' }}></div>
          <div className="skeleton skeleton--row"></div>
          <div className="skeleton skeleton--row"></div>
        </div>
      </ShowcaseBlock>

      <ShowcaseBlock
        title="Empty states"
        rule=".empty-state — módulo sin datos, búsqueda vacía o sección pendiente de contenido"
      >
        <div className="showcase-grid">
          <div className="card" style={{ padding: 'var(--space-6)' }}>
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
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6" />
                </svg>
              }
              title="Sin comunicados"
              description="No hay novedades publicadas en este momento."
            />
          </div>
          <div className="card" style={{ padding: 'var(--space-6)' }}>
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
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
              }
              title="Sin resultados"
              description="Pruebe con otros términos de búsqueda."
              action={
                <Button variant="quiet" type="button">
                  Limpiar filtros
                </Button>
              }
            />
          </div>
        </div>
      </ShowcaseBlock>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Detalle del registro"
        labelledBy="demo-modal-title"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={() => setModal(false)}>
              Aceptar
            </Button>
          </>
        }
      >
        <p>
          Contenido del modal usando componentes normados. En producción: formulario de edición
          rápida o vista de detalle.
        </p>
      </Modal>

      <ConfirmModal
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => setConfirm(false)}
        title="Confirmar eliminación"
        description="¿Está seguro de eliminar este registro? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
      />

      <Drawer
        open={drawer}
        onClose={() => setDrawer(false)}
        title="Filtros avanzados"
        wide
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
        <Field label="Rubro" htmlFor="dr-rubro">
          <Select id="dr-rubro" defaultValue="Todos">
            <option>Todos</option>
            <option>Tecnología</option>
          </Select>
        </Field>
        <Field label="Desde" htmlFor="dr-desde">
          <Input id="dr-desde" type="date" />
        </Field>
      </Drawer>

      <Modal
        open={reserva === 'detail'}
        onClose={() => setReserva(null)}
        title="Capacitación interna SSGG"
        labelledBy="demo-res-detail-title"
        className="modal--reservation"
        ribbon={
          <div
            className="reservation-modal__ribbon"
            style={{ background: 'oklch(82% 0.10 285)' }}
            aria-hidden
          />
        }
        afterHeader={
          <div className="reservation-modal__subheader">
            <p className="reservation-modal__meta">Coposa · Salas</p>
            <Badge variant="success" className="reservation-modal__badge">
              Agendada
            </Badge>
          </div>
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setReserva(null)}>
              Cerrar
            </Button>
            <Button variant="outline" onClick={() => setReserva(null)}>
              Editar
            </Button>
            <Button variant="danger" onClick={() => setReserva('confirm')}>
              Cancelar reserva
            </Button>
          </>
        }
      >
        <div className="detail-grid">
          <div className="detail-field">
            <div className="detail-field__label">Recurso</div>
            <div className="detail-field__value">Coposa</div>
          </div>
          <div className="detail-field">
            <div className="detail-field__label">Categoría</div>
            <div className="detail-field__value">Salas</div>
          </div>
          <div className="detail-field detail-field--full">
            <div className="detail-field__label">Fecha</div>
            <div className="detail-field__value">Martes 7 de julio 2026</div>
          </div>
          <div className="detail-field">
            <div className="detail-field__label">Horario</div>
            <div className="detail-field__value">09:00 – 11:00</div>
          </div>
          <div className="detail-field">
            <div className="detail-field__label">Responsable</div>
            <div className="detail-field__value">Servicios Generales</div>
          </div>
          <div className="detail-field">
            <div className="detail-field__label">Área / departamento</div>
            <div className="detail-field__value">Servicios Generales</div>
          </div>
          <div className="detail-field">
            <div className="detail-field__label">Participantes</div>
            <div className="detail-field__value">Según convocatoria</div>
          </div>
        </div>
      </Modal>

      <Modal
        open={reserva === 'pending'}
        onClose={() => setReserva(null)}
        title="Revisión presupuesto Q3"
        labelledBy="demo-res-pending-title"
        className="modal--reservation reservation-modal--pending"
        footerClassName="modal__footer--split"
        ribbon={
          <div
            className="reservation-modal__ribbon"
            style={{ background: 'oklch(82% 0.10 285)' }}
            aria-hidden
          />
        }
        afterHeader={
          <div className="reservation-modal__subheader">
            <p className="reservation-modal__meta">Coposa · Salas</p>
            <Badge variant="warning" className="reservation-modal__badge">
              Pendiente de aprobación
            </Badge>
          </div>
        }
        footer={
          <>
            <div className="modal__footer__start">
              <Button variant="ghost-danger" onClick={() => setReserva('confirm')}>
                Cancelar mi reserva
              </Button>
            </div>
            <div className="modal__footer__end">
              <Button variant="danger-outline" onClick={() => setReserva('confirm')}>
                Rechazar
              </Button>
              <Button variant="primary" onClick={() => setReserva(null)}>
                Aprobar
              </Button>
            </div>
          </>
        }
      >
        <Alert
          variant="warning"
          title="Requiere revisión administrativa"
          className="reservation-modal__alert"
        >
          <p>
            Revise los datos de la solicitud antes de aprobar o rechazar. El solicitante será
            notificado del resultado.
          </p>
        </Alert>
        <div className="detail-grid">
          <div className="detail-field">
            <div className="detail-field__label">Recurso</div>
            <div className="detail-field__value">Coposa</div>
          </div>
          <div className="detail-field">
            <div className="detail-field__label">Categoría</div>
            <div className="detail-field__value">Salas</div>
          </div>
          <div className="detail-field detail-field--full">
            <div className="detail-field__label">Fecha</div>
            <div className="detail-field__value">Miércoles 8 de julio 2026</div>
          </div>
          <div className="detail-field">
            <div className="detail-field__label">Horario</div>
            <div className="detail-field__value">14:00 – 16:00</div>
          </div>
          <div className="detail-field">
            <div className="detail-field__label">Solicitante</div>
            <div className="detail-field__value">Finanzas</div>
          </div>
          <div className="detail-field">
            <div className="detail-field__label">Área / departamento</div>
            <div className="detail-field__value">Dirección de Finanzas</div>
          </div>
        </div>
        <div className="reservation-modal__notes">
          <div className="detail-field__label">Observaciones</div>
          <p className="reservation-modal__notes-text">
            Solicitud ingresada desde el portal interno. Requiere validación del administrador del
            recurso.
          </p>
        </div>
      </Modal>

      <ConfirmModal
        open={reserva === 'confirm'}
        onClose={() => setReserva(null)}
        onConfirm={() => setReserva(null)}
        variant="confirm"
        title="Confirmar acción"
        description="¿Está seguro? Esta acción no se puede deshacer."
        confirmLabel="Confirmar"
        cancelLabel="Volver"
      />
    </>
  )
}
