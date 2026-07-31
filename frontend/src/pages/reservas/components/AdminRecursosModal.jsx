import React, { useEffect, useRef, useState } from 'react'
import {
  Modal,
  Button,
  Icon,
  IconButton,
  Field,
  Input,
  Textarea,
  Alert,
  Badge,
  ConfirmModal,
  useFormOverlay,
  formatApiFormError,
} from '@slep/ui'
import {
  RECURSO_ICON_NAMES,
  TYPE_LABELS,
  DEFAULT_COLORS,
} from '../shared/constants'
import { contrastOnFill } from '../shared/dateUtils'

const TIPO_OPTIONS = [
  { v: 'SALA', l: 'Sala', icon: 'building' },
  { v: 'VEHICULO', l: 'Vehículo', icon: 'car' },
  { v: 'PROYECTOR', l: 'Equipo', icon: 'monitor' },
  { v: 'OTRO', l: 'Otro', icon: 'box' },
]

export default function AdminRecursosModal({
  open,
  onClose,
  recursos,
  bloqueos,
  settings,
  setSettings,
  adminEditing,
  adminForm,
  setAdminForm,
  adminError,
  setAdminError,
  bloqueoForm,
  setBloqueoForm,
  bloqueoError,
  bloqueoSaving,
  bulkDays,
  setBulkDays,
  selectedBulk,
  setSelectedBulk,
  canManageSettings,
  todayStr,
  onOpenCreate,
  onOpenEdit,
  onSave,
  onToggle,
  onDelete,
  onSaveSettings,
  onBulkUpdate,
  onBloqueoSave,
  onBloqueoDelete,
  onAfterResourceSave,
}) {
  const [confirmAction, setConfirmAction] = useState(null)
  const [bloqueosOpen, setBloqueosOpen] = useState(false)
  const overlay = useFormOverlay()
  const saveKindRef = useRef(null)

  const isEditing = adminEditing && adminEditing.id !== 'settings'
  const isSettings = adminEditing?.id === 'settings'
  const busy = overlay.busy

  useEffect(() => {
    setBloqueosOpen(false)
  }, [adminEditing?.id])

  useEffect(() => {
    if (!open) {
      overlay.reset()
      saveKindRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const closeConfirm = () => setConfirmAction(null)

  const handleConfirm = async () => {
    if (confirmAction?.type === 'toggle') {
      await onToggle(confirmAction.resource)
    } else if (confirmAction?.type === 'delete') {
      await onDelete(confirmAction.resource)
    }
    closeConfirm()
  }

  const confirmDescription =
    confirmAction?.type === 'toggle'
      ? `¿${confirmAction.resource.activo ? 'Desactivar' : 'Activar'} "${confirmAction.resource.nombre}"?`
      : confirmAction?.type === 'delete'
        ? `¿Eliminar permanentemente "${confirmAction.resource.nombre}"?`
        : ''

  const handleOverlayDismiss = () => {
    if (overlay.status === 'success') {
      const kind = saveKindRef.current
      saveKindRef.current = null
      overlay.reset()
      if (kind === 'resource') onAfterResourceSave?.()
      return
    }
    overlay.dismiss()
  }

  const handleClose = () => {
    if (busy) return
    overlay.reset()
    onClose()
  }

  const handleResourceSubmit = async (e) => {
    e.preventDefault()
    if (!adminForm.nombre.trim()) {
      setAdminError?.('El nombre es obligatorio.')
      return
    }
    setAdminError?.('')
    saveKindRef.current = 'resource'
    try {
      await overlay.run(() => onSave(), {
        successDescription: isEditing ? 'Recurso actualizado.' : 'Recurso creado.',
        formatError: (err) => formatApiFormError(err, 'No se pudo guardar el recurso.'),
      })
    } catch {
      // FormOverlay
    }
  }

  const handleSettingsSubmit = async (e) => {
    e.preventDefault()
    setAdminError?.('')
    saveKindRef.current = 'settings'
    try {
      await overlay.run(() => onSaveSettings(), {
        successDescription: 'Horario laboral actualizado.',
        formatError: (err) => formatApiFormError(err, 'Error al guardar la configuración.'),
      })
    } catch {
      // FormOverlay
    }
  }

  const handleBulkClick = async () => {
    if (selectedBulk.length === 0) return
    setAdminError?.('')
    saveKindRef.current = 'bulk'
    try {
      await overlay.run(() => onBulkUpdate(), {
        successDescription: `Configuración aplicada a ${selectedBulk.length} recursos.`,
        formatError: (err) => formatApiFormError(err, 'Error al actualizar recursos en masa.'),
      })
    } catch {
      // FormOverlay
    }
  }

  return (
    <>
      <Modal
        open={open}
        onClose={handleClose}
        size="lg"
        smoothSize={false}
        className={`modal--resource-admin${isEditing ? ' is-editing' : ''}${isSettings ? ' is-settings' : ''}`}
        title="Administrar Recursos"
        subheader={<p className="modal__desc">Salas, vehículos y equipos reservables</p>}
        bodyClassName="resource-admin__body"
        {...overlay.modalProps}
        onOverlayDismiss={handleOverlayDismiss}
        footer={
          <div className="resource-admin__footer-actions">
            {isEditing ? (
              <div className="resource-admin__footer-start">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy}
                  onClick={() =>
                    setConfirmAction({ type: 'toggle', resource: adminEditing })
                  }
                >
                  {adminEditing.activo ? 'Desactivar' : 'Activar'}
                </Button>
                <IconButton
                  type="button"
                  danger
                  disabled={busy}
                  aria-label="Eliminar recurso"
                  onClick={() =>
                    setConfirmAction({ type: 'delete', resource: adminEditing })
                  }
                >
                  <Icon name="trash" size={16} />
                </IconButton>
              </div>
            ) : (
              <span className="resource-admin__footer-spacer" aria-hidden />
            )}
            <div className="resource-admin__footer-end">
              {isEditing ? (
                <Button
                  type="submit"
                  form="resource-admin-form"
                  variant="primary"
                  loading={busy}
                  disabled={busy || overlay.active}
                >
                  Guardar cambios
                </Button>
              ) : null}
              <Button type="button" variant="ghost" onClick={handleClose} disabled={busy}>
                Cerrar
              </Button>
            </div>
          </div>
        }
      >
        <div
          className={`resource-admin__layout${isEditing ? ' is-editing' : ''}${isSettings ? ' is-settings' : ''}`}
        >
          <div className="resource-admin__panel resource-admin__panel--list">
            <div className="resource-admin__list-header">
              <span className="resource-admin__list-label">Recursos existentes</span>
              {canManageSettings ? (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    if (isSettings) onOpenCreate()
                    else onOpenEdit({ id: 'settings', isSettings: true })
                  }}
                >
                  <Icon name={isSettings ? 'box' : 'clock'} size="sm" />
                  {isSettings ? 'Recurso' : 'Horario'}
                </Button>
              ) : null}
            </div>

            <div className="resource-admin__list">
              {recursos.length === 0 ? (
                <p className="field__hint">Sin recursos.</p>
              ) : (
                recursos.map((r) => {
                  const selected = adminEditing?.id === r.id
                  const color = r.color || '#6366f1'
                  const iconName = RECURSO_ICON_NAMES[r.tipo] || 'box'
                  return (
                    <button
                      key={r.id}
                      type="button"
                      className={`resource-admin__item${selected ? ' is-active' : ''}${!r.activo ? ' is-inactive' : ''}`}
                      onClick={() => onOpenEdit(r)}
                    >
                      <span
                        className="resource-admin__swatch"
                        style={{
                          background: color,
                          color: contrastOnFill(color),
                        }}
                      >
                        <Icon name={iconName} size={14} />
                      </span>
                      <span className="resource-admin__meta">
                        <span className="resource-admin__name">{r.nombre}</span>
                        <span className="resource-admin__cat">
                          {TYPE_LABELS[r.tipo] || r.tipo}
                        </span>
                      </span>
                      {!r.activo ? (
                        <Badge variant="neutral">Inactivo</Badge>
                      ) : null}
                    </button>
                  )
                })
              )}
            </div>
          </div>

          <div className="resource-admin__panel resource-admin__panel--form">
            <div className="resource-admin__form-head">
              {isEditing ? (
                <button type="button" className="resource-admin__back" onClick={onOpenCreate}>
                  <Icon name="chevron-left" size={16} /> Volver
                </button>
              ) : null}
              <h3 className="resource-admin__form-title">
                {isSettings
                  ? 'Horario laboral'
                  : isEditing
                    ? `Editando: ${adminEditing.nombre}`
                    : 'Crear nuevo recurso'}
              </h3>
            </div>

            {adminError ? <Alert variant="danger">{adminError}</Alert> : null}

            {isSettings ? (
              <div className="resource-admin__settings">
                <form
                  onSubmit={handleSettingsSubmit}
                  className="resource-admin__settings-form"
                >
                  <div className="form-grid">
                    <Field label="Hora de Inicio" htmlFor="settings-inicio">
                      <Input
                        id="settings-inicio"
                        type="time"
                        step="1800"
                        value={settings.hora_inicio.slice(0, 5)}
                        onChange={(e) =>
                          setSettings((p) => ({ ...p, hora_inicio: e.target.value }))
                        }
                        required
                      />
                    </Field>
                    <Field label="Hora de Término" htmlFor="settings-fin">
                      <Input
                        id="settings-fin"
                        type="time"
                        step="1800"
                        value={settings.hora_fin.slice(0, 5)}
                        onChange={(e) =>
                          setSettings((p) => ({ ...p, hora_fin: e.target.value }))
                        }
                        required
                      />
                    </Field>
                  </div>
                  <div className="resource-admin__form-actions">
                    <Button
                      type="submit"
                      variant="primary"
                      loading={busy}
                      disabled={busy || overlay.active}
                    >
                      <Icon name="check" size="sm" /> Actualizar horario
                    </Button>
                  </div>
                </form>

                <div className="resource-admin__bulk">
                  <h4>Aplicar Antelación en Masa</h4>
                  <Field label="Días de Antelación" htmlFor="bulk-days">
                    <Input
                      id="bulk-days"
                      type="number"
                      min="0"
                      value={bulkDays || 0}
                      onChange={(e) => setBulkDays(parseInt(e.target.value, 10) || 0)}
                    />
                  </Field>
                  <Field label="Seleccionar Recursos">
                    <div className="resource-admin__bulk-list">
                      {recursos.map((r) => (
                        <label key={r.id} className="resource-admin__bulk-item">
                          <input
                            type="checkbox"
                            checked={selectedBulk.includes(r.id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedBulk((p) => [...p, r.id])
                              else setSelectedBulk((p) => p.filter((id) => id !== r.id))
                            }}
                          />
                          <span>{r.nombre}</span>
                        </label>
                      ))}
                    </div>
                  </Field>
                  <div className="resource-admin__form-actions">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleBulkClick}
                      disabled={busy || selectedBulk.length === 0 || overlay.active}
                      loading={busy}
                    >
                      <Icon name="check" size="sm" /> Aplicar a {selectedBulk.length} recursos
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <form
                  id="resource-admin-form"
                  onSubmit={handleResourceSubmit}
                  className="resource-admin__form"
                >
                  <Field label="Tipo *">
                    <div className="choice-grid choice-grid--types" role="group" aria-label="Tipo de recurso">
                      {TIPO_OPTIONS.map(({ v, l, icon }) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setAdminForm((p) => ({ ...p, tipo: v }))}
                          className={`choice-card choice-card--compact${adminForm.tipo === v ? ' is-active' : ''}`}
                        >
                          <Icon name={icon} size={16} className="choice-card__icon" />
                          <span className="choice-card__label">{l}</span>
                        </button>
                      ))}
                    </div>
                  </Field>

                  <Field label="Nombre" htmlFor="admin-nombre" required>
                    <Input
                      id="admin-nombre"
                      value={adminForm.nombre}
                      onChange={(e) => setAdminForm((p) => ({ ...p, nombre: e.target.value }))}
                      placeholder="Ej: Sala Directorio, Van Toyota…"
                      required
                    />
                  </Field>

                  <Field label="Color en calendario" hint="Así se verá en la grilla de reservas">
                    <div className="color-picker">
                      <div className="color-picker__row">
                        <input
                          type="color"
                          className="color-picker__native"
                          value={adminForm.color}
                          onChange={(e) => setAdminForm((p) => ({ ...p, color: e.target.value }))}
                          aria-label="Elegir color personalizado"
                        />
                        <div className="color-picker__swatches">
                          {DEFAULT_COLORS.map((c) => (
                            <button
                              key={c}
                              type="button"
                              className={`color-picker__swatch${adminForm.color === c ? ' is-active' : ''}`}
                              style={{ background: c }}
                              onClick={() => setAdminForm((p) => ({ ...p, color: c }))}
                              title={c}
                              aria-label={`Color ${c}`}
                            />
                          ))}
                        </div>
                        <span
                          className="color-picker__chip"
                          style={{
                            background: adminForm.color,
                            color: contrastOnFill(adminForm.color),
                          }}
                        >
                          {adminForm.nombre || 'Vista previa'}
                        </span>
                      </div>
                    </div>
                  </Field>

                  <div className="form-grid form-grid--3">
                    <Field label="Ubicación" htmlFor="admin-ubicacion">
                      <Input
                        id="admin-ubicacion"
                        value={adminForm.ubicacion}
                        onChange={(e) =>
                          setAdminForm((p) => ({ ...p, ubicacion: e.target.value }))
                        }
                        placeholder="Ej: Piso 2"
                      />
                    </Field>
                    <Field label="Capacidad" htmlFor="admin-capacidad">
                      <Input
                        id="admin-capacidad"
                        type="number"
                        min="1"
                        value={adminForm.capacidad}
                        onChange={(e) =>
                          setAdminForm((p) => ({
                            ...p,
                            capacidad: parseInt(e.target.value, 10) || 1,
                          }))
                        }
                      />
                    </Field>
                    <Field
                      label="Antelación (días)"
                      htmlFor="admin-antelacion"
                      hint="Mín. de anticipación"
                    >
                      <Input
                        id="admin-antelacion"
                        type="number"
                        min="0"
                        value={adminForm.dias_antelacion}
                        onChange={(e) =>
                          setAdminForm((p) => ({
                            ...p,
                            dias_antelacion: parseInt(e.target.value, 10) || 0,
                          }))
                        }
                      />
                    </Field>
                  </div>

                  <Field label="Descripción" htmlFor="admin-descripcion">
                    <Textarea
                      id="admin-descripcion"
                      rows={2}
                      value={adminForm.descripcion}
                      onChange={(e) =>
                        setAdminForm((p) => ({ ...p, descripcion: e.target.value }))
                      }
                      placeholder="Equipamiento, notas…"
                    />
                  </Field>

                  {!isEditing ? (
                    <div className="resource-admin__form-actions">
                      <Button
                        type="submit"
                        variant="primary"
                        loading={busy}
                        disabled={busy || overlay.active}
                      >
                        <Icon name="plus" size="sm" /> Crear recurso
                      </Button>
                    </div>
                  ) : null}
                </form>

                {isEditing ? (
                  <div className="resource-admin__bloqueos">
                    <button
                      type="button"
                      className={`resource-admin__bloqueos-toggle${bloqueosOpen ? ' is-open' : ''}`}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setBloqueosOpen((open) => !open)
                      }}
                      aria-expanded={bloqueosOpen}
                    >
                      <span className="resource-admin__bloqueos-toggle-main">
                        <Icon name="lock" size={14} />
                        Bloqueos de horario
                      </span>
                      <Icon
                        name="chevron"
                        size={16}
                        className={`resource-admin__bloqueos-chevron${bloqueosOpen ? ' is-open' : ''}`}
                      />
                    </button>

                    {bloqueosOpen ? (
                      <div className="resource-admin__bloqueos-panel">
                        {bloqueos.filter((b) => b.recurso === adminEditing.id).length > 0 ? (
                          <div className="resource-admin__bloqueos-list">
                            {bloqueos
                              .filter((b) => b.recurso === adminEditing.id)
                              .map((b) => {
                                const modoCfg = {
                                  DIA: 'Día',
                                  RANGO: 'Rango',
                                  INDEFINIDO: '∞',
                                }
                                const period =
                                  b.modo === 'DIA'
                                    ? b.fecha_inicio
                                    : b.modo === 'RANGO'
                                      ? `${b.fecha_inicio} → ${b.fecha_fin}`
                                      : `Desde ${b.fecha_inicio}`
                                return (
                                  <div key={b.id} className="resource-admin__bloqueo-item">
                                    <div className="resource-admin__bloqueo-meta">
                                      <BadgeLike label={modoCfg[b.modo] || b.modo} />
                                      <strong className="resource-admin__bloqueo-period">
                                        {period}
                                      </strong>
                                      <span className="resource-admin__bloqueo-time">
                                        {b.hora_inicio.slice(0, 5)} – {b.hora_fin.slice(0, 5)}
                                      </span>
                                      {b.motivo ? (
                                        <em className="resource-admin__bloqueo-motivo">
                                          {b.motivo}
                                        </em>
                                      ) : null}
                                    </div>
                                    <IconButton
                                      type="button"
                                      aria-label="Eliminar bloqueo"
                                      onClick={() => onBloqueoDelete(b.id)}
                                    >
                                      <Icon name="close" size={14} />
                                    </IconButton>
                                  </div>
                                )
                              })}
                          </div>
                        ) : (
                          <p className="field__hint">Sin bloqueos para este recurso.</p>
                        )}

                        <form onSubmit={onBloqueoSave} className="resource-admin__bloqueo-form">
                          <p className="resource-admin__bloqueo-form-title">Agregar bloqueo</p>
                          {bloqueoError ? <Alert variant="danger">{bloqueoError}</Alert> : null}

                          <Field label="Tipo de bloqueo *">
                            <div className="segment-control">
                              {[
                                { v: 'DIA', l: 'Día' },
                                { v: 'RANGO', l: 'Rango' },
                                { v: 'INDEFINIDO', l: 'Indefinido' },
                              ].map(({ v, l }) => (
                                <button
                                  key={v}
                                  type="button"
                                  className={`segment-control__btn${bloqueoForm.modo === v ? ' is-active' : ''}`}
                                  onClick={() =>
                                    setBloqueoForm((p) => ({ ...p, modo: v, fecha_fin: '' }))
                                  }
                                >
                                  {l}
                                </button>
                              ))}
                            </div>
                          </Field>

                          <div className="form-grid">
                            <Field
                              label={
                                bloqueoForm.modo === 'DIA'
                                  ? 'Fecha *'
                                  : bloqueoForm.modo === 'INDEFINIDO'
                                    ? 'Desde *'
                                    : 'Fecha inicio *'
                              }
                              htmlFor="bloqueo-inicio"
                            >
                              <Input
                                id="bloqueo-inicio"
                                type="date"
                                min={todayStr}
                                required
                                value={bloqueoForm.fecha_inicio}
                                onChange={(e) =>
                                  setBloqueoForm((p) => ({
                                    ...p,
                                    fecha_inicio: e.target.value,
                                  }))
                                }
                              />
                            </Field>
                            {bloqueoForm.modo === 'RANGO' ? (
                              <Field label="Fecha fin *" htmlFor="bloqueo-fin">
                                <Input
                                  id="bloqueo-fin"
                                  type="date"
                                  required
                                  min={bloqueoForm.fecha_inicio}
                                  value={bloqueoForm.fecha_fin}
                                  onChange={(e) =>
                                    setBloqueoForm((p) => ({
                                      ...p,
                                      fecha_fin: e.target.value,
                                    }))
                                  }
                                />
                              </Field>
                            ) : null}
                          </div>

                          <div className="form-grid">
                            <Field label="Hora inicio *" htmlFor="bloqueo-hi">
                              <Input
                                id="bloqueo-hi"
                                type="time"
                                required
                                value={bloqueoForm.hora_inicio}
                                onChange={(e) =>
                                  setBloqueoForm((p) => ({
                                    ...p,
                                    hora_inicio: e.target.value,
                                  }))
                                }
                              />
                            </Field>
                            <Field label="Hora fin *" htmlFor="bloqueo-hf">
                              <Input
                                id="bloqueo-hf"
                                type="time"
                                required
                                value={bloqueoForm.hora_fin}
                                onChange={(e) =>
                                  setBloqueoForm((p) => ({ ...p, hora_fin: e.target.value }))
                                }
                              />
                            </Field>
                          </div>

                          <Field label="Motivo (opcional)" htmlFor="bloqueo-motivo">
                            <Input
                              id="bloqueo-motivo"
                              value={bloqueoForm.motivo}
                              onChange={(e) =>
                                setBloqueoForm((p) => ({ ...p, motivo: e.target.value }))
                              }
                              placeholder="Ej: Mantención, feriado…"
                            />
                          </Field>

                          <div className="resource-admin__form-actions">
                            <Button type="submit" variant="primary" loading={bloqueoSaving}>
                              <Icon name="lock" size="sm" /> Agregar bloqueo
                            </Button>
                          </div>
                        </form>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={!!confirmAction}
        onClose={closeConfirm}
        onConfirm={handleConfirm}
        title={confirmAction?.type === 'delete' ? 'Eliminar recurso' : 'Cambiar estado'}
        description={confirmDescription}
        confirmLabel={confirmAction?.type === 'delete' ? 'Eliminar' : 'Confirmar'}
        danger
      />
    </>
  )
}

function BadgeLike({ label }) {
  return <Badge variant="neutral">{label}</Badge>
}
