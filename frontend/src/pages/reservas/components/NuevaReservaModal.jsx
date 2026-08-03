import React, { useEffect, useState } from 'react'
import {
  Modal,
  Field,
  Input,
  Select,
  Textarea,
  Button,
  Icon,
  Alert,
  useFormOverlay,
  formatApiFormError,
} from '@slep/ui'
import {
  RECURSO_ICON_NAMES,
  TYPE_LABELS,
  sortByType,
} from '../shared/constants'
import { toDateStr, dtMinutes, bloqueoAppliesToDate, hexToRgba } from '../shared/dateUtils'

export default function NuevaReservaModal({
  open,
  onClose,
  formData,
  setFormData,
  formTipo,
  setFormTipo,
  onSave,
  recursos,
  reservas,
  bloqueos,
  timeSlots,
  settings,
  todayStr,
  canChangeName,
  canBypass,
  /** Portal público: email institucional + honeypot */
  showEmailField = false,
  honeypot = '',
  setHoneypot,
  title = 'Nueva Reserva',
  subtitle = 'Solicitud de uso de recurso',
  submitLabel = 'Enviar Solicitud',
  successDescription = 'Solicitud enviada. Un administrador la revisará pronto.',
}) {
  const overlay = useFormOverlay()
  const [localError, setLocalError] = useState('')

  useEffect(() => {
    if (!open) return
    overlay.reset()
    setLocalError('')
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset al abrir
  }, [open])

  const recursosDeTipo = formTipo
    ? recursos.filter((r) => r.tipo === formTipo && r.activo !== false).sort(sortByType)
    : []

  const resDia = reservas.filter(
    (r) =>
      parseInt(r.recurso, 10) === parseInt(formData.recurso, 10) &&
      r.estado === 'APROBADA' &&
      toDateStr(r.fecha_inicio) === formData.fecha,
  )

  const getMins = (s) => {
    const [h, m] = s.split(':').map(Number)
    return h * 60 + m
  }

  const now = new Date()
  const nowHourStart = now.getHours() * 60
  const nowMins = nowHourStart + now.getMinutes()
  const esHoy = formData.fecha === todayStr

  const slotsDesde = timeSlots.filter((s) => {
    const m = getMins(s)
    if (esHoy && m < nowHourStart && !canBypass) return false

    const occupiesReserva = resDia.some((r) => {
      const ri = dtMinutes(r.fecha_inicio)
      const rf = dtMinutes(r.fecha_fin)
      return m >= ri && m < rf
    })

    const occupiesBloqueo = bloqueos.some((b) => {
      const matchRec = Number(b.recurso) === Number(formData.recurso)
      const matchDate = bloqueoAppliesToDate(b, formData.fecha)
      if (!matchRec || !matchDate) return false
      const hiB = (b.hora_inicio || '00:00')
        .split(':')
        .slice(0, 2)
        .reduce((h, ms) => h * 60 + Number(ms), 0)
      const hfB = (b.hora_fin || '23:59')
        .split(':')
        .slice(0, 2)
        .reduce((h, ms) => h * 60 + Number(ms), 0)
      return m >= hiB && m < hfB
    })

    if (occupiesReserva) return false
    if (occupiesBloqueo && !canBypass) return false
    return true
  })

  // Si el "Desde" preseleccionado ya no es válido, usar el primero disponible
  // para calcular "Hasta" (si no, la lista queda vacía hasta re-seleccionar).
  const desdeEfectivo = slotsDesde.includes(formData.horaInicio)
    ? formData.horaInicio
    : slotsDesde[0] || formData.horaInicio
  const mDesde = getMins(desdeEfectivo)
  const horaFinLimit = settings.hora_fin.slice(0, 5)
  const slotsHasta = [...timeSlots, horaFinLimit]
    .filter((s, idx, self) => self.indexOf(s) === idx)
    .filter((s) => {
      const m = getMins(s)
      if (m <= mDesde) return false
      // El término no puede quedar en el pasado: las PENDIENTE se auto-eliminan
      if (esHoy && m <= nowMins) return false
      const sigReserva = resDia
        .filter((r) => dtMinutes(r.fecha_inicio) >= mDesde)
        .sort((a, b) => dtMinutes(a.fecha_inicio) - dtMinutes(b.fecha_inicio))[0]
      if (sigReserva && m > dtMinutes(sigReserva.fecha_inicio)) return false

      const saltandoBloqueo = bloqueos.some((b) => {
        const matchRec = Number(b.recurso) === Number(formData.recurso)
        const matchDate = bloqueoAppliesToDate(b, formData.fecha)
        if (!matchRec || !matchDate) return false
        const hiB = (b.hora_inicio || '00:00')
          .split(':')
          .slice(0, 2)
          .reduce((h, ms) => h * 60 + Number(ms), 0)
        return hiB < m && hiB >= mDesde
      })
      if (saltandoBloqueo && !canBypass) return false
      return true
    })

  // Alinear formData con slots válidos al abrir / al cambiar contexto
  useEffect(() => {
    if (!open) return
    const next = {}
    if (slotsDesde.length > 0 && !slotsDesde.includes(formData.horaInicio)) {
      next.horaInicio = slotsDesde[0]
    }
    const inicio = next.horaInicio || formData.horaInicio
    const mIni = getMins(inicio)
    const hastaValidos = [...timeSlots, settings.hora_fin.slice(0, 5)]
      .filter((s, idx, self) => self.indexOf(s) === idx)
      .filter((s) => {
        const m = getMins(s)
        if (m <= mIni) return false
        if (esHoy && m <= nowMins) return false
        return true
      })
    if (hastaValidos.length > 0 && !hastaValidos.includes(formData.horaFin)) {
      next.horaFin = hastaValidos[0]
    }
    if (Object.keys(next).length > 0) {
      setFormData((p) => ({ ...p, ...next }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync puntual de slots
  }, [
    open,
    formData.fecha,
    formData.recurso,
    formData.horaInicio,
    formData.horaFin,
    slotsDesde.join('|'),
    esHoy,
    nowHourStart,
  ])

  const handleClose = () => {
    if (overlay.busy) return
    overlay.reset()
    onClose()
  }

  const handleOverlayDismiss = () => {
    if (overlay.status === 'success') {
      overlay.reset()
      onClose({ saved: true })
      return
    }
    overlay.dismiss()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLocalError('')
    if (!formData.recurso) {
      setLocalError('Selecciona un recurso')
      return
    }
    if (esHoy && getMins(formData.horaFin) <= nowMins) {
      setLocalError('La hora de término debe ser posterior a la hora actual.')
      return
    }
    if (slotsHasta.length === 0) {
      setLocalError('No hay un horario de término válido para esta hora de inicio.')
      return
    }
    try {
      await overlay.run(() => onSave(), {
        successDescription,
        formatError: (err) => formatApiFormError(err, 'Error al enviar la solicitud.'),
      })
    } catch {
      // visible en FormOverlay
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      className="modal--new-reservation"
      title={title}
      subheader={<p className="modal__desc">{subtitle}</p>}
      {...overlay.modalProps}
      onOverlayDismiss={handleOverlayDismiss}
      footer={
        <Button
          type="submit"
          form="nueva-reserva-form"
          variant="primary"
          loading={overlay.busy}
          disabled={overlay.busy || overlay.active}
        >
          <Icon name="plus" size="sm" />
          {overlay.busy ? 'Enviando…' : submitLabel}
        </Button>
      }
    >
      <form id="nueva-reserva-form" onSubmit={handleSubmit} className="modal__form">
        {localError ? (
          <Alert variant="danger" className="modal__alert">
            {localError}
          </Alert>
        ) : null}

        <Field label="Tipo de recurso *" className="field--full">
          <div className="choice-grid choice-grid--types">
            {Object.entries(TYPE_LABELS).map(([tipo, label]) => {
              const tieneRecursos = recursos.some((r) => r.tipo === tipo && r.activo !== false)
              const isSelected = formTipo === tipo
              const iconName = RECURSO_ICON_NAMES[tipo] || 'box'
              return (
                <button
                  key={tipo}
                  type="button"
                  disabled={!tieneRecursos || overlay.busy}
                  aria-disabled={!tieneRecursos}
                  title={
                    tieneRecursos
                      ? undefined
                      : `No hay ${label.toLowerCase()} disponibles`
                  }
                  onClick={() => {
                    if (!tieneRecursos) return
                    setFormTipo(tipo)
                    setFormData((p) => ({ ...p, recurso: '' }))
                  }}
                  className={`choice-card${isSelected ? ' is-active' : ''}${!tieneRecursos ? ' is-disabled' : ''}`}
                >
                  <span className="choice-card__icon">
                    <Icon name={iconName} size={16} />
                  </span>
                  <span className="choice-card__label">{label}</span>
                </button>
              )
            })}
          </div>
        </Field>

        {formTipo ? (
          <Field label={`${TYPE_LABELS[formTipo]} disponibles *`} className="field--full">
            {recursosDeTipo.length === 0 ? (
              <p className="field__hint">No hay recursos de este tipo</p>
            ) : (
              <div className="choice-grid choice-grid--resources">
                {recursosDeTipo.map((r) => {
                  const isSelected = parseInt(formData.recurso, 10) === r.id
                  const color = r.color || '#6366f1'
                  const iconName = RECURSO_ICON_NAMES[r.tipo] || 'box'
                  return (
                    <button
                      key={r.id}
                      type="button"
                      disabled={overlay.busy}
                      onClick={() => setFormData((p) => ({ ...p, recurso: r.id }))}
                      className={`choice-card choice-card--resource${isSelected ? ' is-active' : ''}`}
                      style={{
                        '--resource-color': color,
                        borderColor: isSelected ? color : undefined,
                        background: isSelected ? hexToRgba(color, 0.08) : undefined,
                      }}
                    >
                      <span
                        className="choice-card__swatch"
                        style={{ background: isSelected ? color : hexToRgba(color, 0.2) }}
                      >
                        <Icon name={iconName} size={12} style={{ color: isSelected ? '#fff' : color }} />
                      </span>
                      <span className="choice-card__body">
                        <span className="choice-card__name" style={{ color: isSelected ? color : undefined }}>
                          {r.nombre}
                        </span>
                        {r.ubicacion ? (
                          <span className="choice-card__meta">{r.ubicacion}</span>
                        ) : null}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </Field>
        ) : null}

        <Field label="Título / Motivo *" htmlFor="reserva-titulo" className="field--full">
          <Input
            id="reserva-titulo"
            value={formData.titulo}
            onChange={(e) => setFormData((p) => ({ ...p, titulo: e.target.value }))}
            placeholder="Ej: Reunión de Directorio…"
            required
            disabled={overlay.busy}
          />
        </Field>

        <Field label="Nombre del Funcionario *" htmlFor="reserva-funcionario" className="field--full">
          <Input
            id="reserva-funcionario"
            value={formData.nombre_funcionario}
            onChange={(e) => setFormData((p) => ({ ...p, nombre_funcionario: e.target.value }))}
            placeholder="Ej: Juan Pérez González"
            required
            readOnly={!canChangeName}
            disabled={!canChangeName || overlay.busy}
          />
        </Field>

        {showEmailField ? (
          <Field label="Correo institucional *" htmlFor="reserva-email" className="field--full">
            <div className="input-with-suffix">
              <Input
                id="reserva-email"
                value={formData.email_contacto || ''}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    email_contacto: e.target.value.replace(/@.*/g, ''),
                  }))
                }
                placeholder="nombre.apellido"
                required
                autoComplete="username"
                disabled={overlay.busy}
              />
              <span className="input-with-suffix__suffix">@slepiquique.cl</span>
            </div>
          </Field>
        ) : null}

        {showEmailField && typeof setHoneypot === 'function' ? (
          <div className="sr-only" aria-hidden="true">
            <label htmlFor="reserva-website">Sitio web</label>
            <input
              id="reserva-website"
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </div>
        ) : null}

        <div className="form-grid form-grid--modal-triple">
          <Field label="Fecha *" htmlFor="reserva-fecha">
            <Input
              id="reserva-fecha"
              type="date"
              min={todayStr}
              value={formData.fecha}
              onChange={(e) => setFormData((p) => ({ ...p, fecha: e.target.value }))}
              required
              disabled={overlay.busy}
            />
          </Field>

          <Field label="Desde *" htmlFor="reserva-desde">
            <Select
              id="reserva-desde"
              value={formData.horaInicio}
              onChange={(e) => setFormData((p) => ({ ...p, horaInicio: e.target.value }))}
              disabled={overlay.busy}
            >
              {slotsDesde.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Hasta *" htmlFor="reserva-hasta">
            <Select
              id="reserva-hasta"
              value={formData.horaFin}
              onChange={(e) => setFormData((p) => ({ ...p, horaFin: e.target.value }))}
              disabled={overlay.busy}
            >
              {slotsHasta.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Observaciones" htmlFor="reserva-descripcion" className="field--full">
          <Textarea
            id="reserva-descripcion"
            className="textarea--compact"
            rows={2}
            value={formData.descripcion}
            onChange={(e) => setFormData((p) => ({ ...p, descripcion: e.target.value }))}
            placeholder="Opcional…"
            disabled={overlay.busy}
          />
        </Field>
      </form>
    </Modal>
  )
}
