import React, { useEffect, useState } from 'react'
import {
  Modal,
  Field,
  Input,
  Select,
  Button,
  Alert,
  Badge,
  Icon,
} from '@slep/ui'
import { toDateStr, toTimeHm, fmtTime, fmtDateWeekday } from '../shared/dateUtils'
import publicApi from './publicApi'

/**
 * Gestión de reserva por código (VIEW / UPDATE / DELETE).
 */
export default function PublicManageModal({
  open,
  onClose,
  initialReserva = null,
  recursos = [],
  timeSlots = [],
  onChanged,
}) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [reserva, setReserva] = useState(null)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    titulo: '',
    fecha: '',
    horaInicio: '09:00',
    horaFin: '10:00',
  })

  useEffect(() => {
    if (!open) return
    setCode('')
    setError('')
    setSuccess('')
    setEditing(false)
    setLoading(false)
    if (initialReserva) {
      setReserva({ ...initialReserva, verificado: false })
    } else {
      setReserva(null)
    }
  }, [open, initialReserva])

  const recursoNombre =
    recursos.find((r) => Number(r.id) === Number(reserva?.recurso))?.nombre || 'Recurso'

  const isPast = reserva?.fecha_fin ? new Date(reserva.fecha_fin) < new Date() : false

  const handleVerify = async () => {
    if (code.length < 6) {
      setError('El código debe tener 6 caracteres.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const resp = await publicApi.post('reservas/solicitudes/public_manage/', {
        codigo_reserva: code,
        accion: 'VIEW',
      })
      setReserva({ ...resp.data, verificado: true })
    } catch {
      setError('Código inválido o no encontrado.')
    } finally {
      setLoading(false)
    }
  }

  const startEdit = () => {
    if (!reserva) return
    setEditForm({
      titulo: reserva.titulo || '',
      fecha: toDateStr(reserva.fecha_inicio),
      horaInicio: toTimeHm(reserva.fecha_inicio),
      horaFin: toTimeHm(reserva.fecha_fin),
    })
    setEditing(true)
  }

  const handleDelete = async () => {
    if (!window.confirm('¿Estás seguro de que deseas anular esta reserva?')) return
    setLoading(true)
    setError('')
    try {
      await publicApi.post('reservas/solicitudes/public_manage/', {
        codigo_reserva: code,
        accion: 'DELETE',
      })
      setSuccess('Tu reserva ha sido anulada correctamente.')
      setReserva(null)
      onChanged?.()
    } catch {
      setError('Error al anular la reserva.')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async () => {
    setLoading(true)
    setError('')
    try {
      await publicApi.post('reservas/solicitudes/public_manage/', {
        codigo_reserva: code,
        accion: 'UPDATE',
        titulo: editForm.titulo,
        fecha_inicio: `${editForm.fecha}T${editForm.horaInicio}:00`,
        fecha_fin: `${editForm.fecha}T${editForm.horaFin}:00`,
      })
      setSuccess('Reserva actualizada. Quedará pendiente de aprobación.')
      setEditing(false)
      setReserva(null)
      onChanged?.()
    } catch {
      setError('Error al actualizar la reserva.')
    } finally {
      setLoading(false)
    }
  }

  const needsCode = !reserva?.verificado

  return (
    <Modal
      open={open}
      onClose={onClose}
      className="modal--public-manage"
      title={editing ? 'Editar Reserva' : 'Gestionar Reserva'}
      subheader={null}
      footer={
        editing && !success ? (
          <>
            <Button type="button" variant="quiet" onClick={() => setEditing(false)}>
              Regresar
            </Button>
            <Button type="button" variant="primary" loading={loading} onClick={handleUpdate}>
              Guardar cambios
            </Button>
          </>
        ) : null
      }
    >
      <div className="modal__form">
        {error ? (
          <Alert variant="danger" className="modal__alert">
            {error}
          </Alert>
        ) : null}
        {success ? (
          <Alert variant="success" className="modal__alert">
            {success}
          </Alert>
        ) : null}

        {!success && needsCode ? (
          <>
            {reserva && !reserva.verificado ? (
              <div className="public-manage-preview">
                <p className="public-manage-preview__label">Reserva seleccionada</p>
                <p className="public-manage-preview__title">{reserva.titulo}</p>
                <p className="public-manage-preview__meta">
                  <Icon name="clock" size={12} />
                  {fmtDateWeekday(reserva.fecha_inicio)} · {fmtTime(reserva.fecha_inicio)}
                </p>
              </div>
            ) : null}

            <p className="field__hint">
              {reserva
                ? 'Para gestionar esta reserva, ingresa el código de 6 caracteres que recibiste por correo.'
                : 'Ingresa el código de 6 caracteres que recibiste en tu correo.'}
            </p>

            <Field label="Código de reserva" htmlFor="public-manage-code" className="field--full">
              <Input
                id="public-manage-code"
                className="public-manage-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="XJ82K1"
                autoComplete="one-time-code"
              />
            </Field>

            <Button
              type="button"
              variant="primary"
              className="btn--full"
              loading={loading}
              disabled={code.length < 6}
              onClick={handleVerify}
            >
              <Icon name="reservas" size="sm" />
              Verificar y gestionar
            </Button>
          </>
        ) : null}

        {!success && reserva?.verificado && !editing ? (
          <div className="public-manage-detail">
            <div className="public-manage-detail__head">
              <Badge variant="accent">{recursoNombre}</Badge>
              <div className="public-manage-detail__badges">
                <Badge
                  variant={
                    reserva.estado === 'APROBADA'
                      ? 'success'
                      : reserva.estado === 'PENDIENTE'
                        ? 'warning'
                        : 'neutral'
                  }
                >
                  {reserva.estado}
                </Badge>
                {isPast ? <Badge variant="neutral">Finalizada</Badge> : null}
              </div>
            </div>
            <h4 className="public-manage-detail__title">{reserva.titulo}</h4>
            <p className="public-manage-detail__when">
              <Icon name="clock" size={14} />
              {fmtDateWeekday(reserva.fecha_inicio)} · {fmtTime(reserva.fecha_inicio)} –{' '}
              {fmtTime(reserva.fecha_fin)}
            </p>

            {!isPast ? (
              <div className="public-manage-detail__actions">
                <Button type="button" variant="secondary" onClick={startEdit}>
                  Editar
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  loading={loading}
                  onClick={handleDelete}
                >
                  Anular
                </Button>
              </div>
            ) : (
              <Alert variant="info">
                No se pueden modificar reservas que ya cumplieron su horario.
              </Alert>
            )}
          </div>
        ) : null}

        {!success && editing ? (
          <>
            <Alert variant="warning" className="modal__alert">
              Si modificas la reserva, volverá a “Pendiente” y un administrador deberá
              aprobarla de nuevo.
            </Alert>
            <Field label="Título" htmlFor="manage-titulo" className="field--full">
              <Input
                id="manage-titulo"
                value={editForm.titulo}
                onChange={(e) => setEditForm((p) => ({ ...p, titulo: e.target.value }))}
              />
            </Field>
            <div className="form-grid form-grid--modal-triple">
              <Field label="Fecha" htmlFor="manage-fecha">
                <Input
                  id="manage-fecha"
                  type="date"
                  value={editForm.fecha}
                  onChange={(e) => setEditForm((p) => ({ ...p, fecha: e.target.value }))}
                />
              </Field>
              <Field label="Desde" htmlFor="manage-desde">
                <Select
                  id="manage-desde"
                  value={editForm.horaInicio}
                  onChange={(e) => setEditForm((p) => ({ ...p, horaInicio: e.target.value }))}
                >
                  {timeSlots
                    .filter((s) => {
                      if (editForm.fecha !== toDateStr(new Date())) return true
                      const [h] = s.split(':').map(Number)
                      return h * 60 >= new Date().getHours() * 60
                    })
                    .map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                </Select>
              </Field>
              <Field label="Hasta" htmlFor="manage-hasta">
                <Select
                  id="manage-hasta"
                  value={editForm.horaFin}
                  onChange={(e) => setEditForm((p) => ({ ...p, horaFin: e.target.value }))}
                >
                  {timeSlots
                    .filter((s) => {
                      const [h, m] = s.split(':').map(Number)
                      const mins = h * 60 + m
                      const [hi, mi] = String(editForm.horaInicio || '0:0')
                        .split(':')
                        .map(Number)
                      if (mins <= hi * 60 + mi) return false
                      if (editForm.fecha === toDateStr(new Date())) {
                        const now = new Date()
                        if (mins <= now.getHours() * 60 + now.getMinutes()) return false
                      }
                      return true
                    })
                    .map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                </Select>
              </Field>
            </div>
          </>
        ) : null}
      </div>
    </Modal>
  )
}
