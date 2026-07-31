import React, { useState } from 'react'
import {
  Modal,
  Button,
  Icon,
  Badge,
  Alert,
  Textarea,
  ConfirmModal,
  Field,
} from '@slep/ui'
import { ESTADO_BADGE, TYPE_LABELS } from '../shared/constants'
import {
  fmtDateWeekday,
  fmtTimeRange,
  fmtDuration,
} from '../shared/dateUtils'

export default function DetalleReservaModal({
  open,
  reserva,
  recurso,
  userId,
  canApproveReserva,
  canForceDelete,
  rechazandoId,
  setRechazandoId,
  motivoRechazo,
  setMotivoRechazo,
  onClose,
  onApprove,
  onReject,
  onFinalize,
  onCancelOwn,
  onForceDelete,
  actionError,
  setActionError,
}) {
  const [confirmAction, setConfirmAction] = useState(null)

  if (!reserva) return null

  const color = recurso?.color || '#6366f1'
  const estado = (reserva.estado || '').toUpperCase()
  const badge = ESTADO_BADGE[estado] || ESTADO_BADGE.PENDIENTE
  const isRechazando = rechazandoId === reserva.id
  const isPast = new Date(reserva.fecha_fin) < new Date()
  const isOwn = reserva.solicitante === userId
  const isPending = estado === 'PENDIENTE'
  const isApproved = estado === 'APROBADA'
  const isBlocked = estado === 'CANCELADA' || estado === 'RECHAZADA'

  const showCancelOwn = isOwn && !isPast && !isRechazando
  const showForceDelete = canForceDelete && !isRechazando
  const showApproveActions = isPending && !isRechazando && canApproveReserva
  const showFinalize = isApproved && canApproveReserva && !isPast && !isRechazando
  const hasFooterActions =
    !isRechazando && (showApproveActions || showFinalize || showCancelOwn || showForceDelete)

  const solicitanteNombre = (reserva.nombre_funcionario || '').trim() || 'No especificado'
  const solicitanteEmail = (reserva.solicitante_email || '').trim()
  const showSolicitanteEmail =
    !!solicitanteEmail &&
    solicitanteEmail.toLowerCase() !== solicitanteNombre.toLowerCase()

  const whenDate = fmtDateWeekday(reserva.fecha_inicio)
  const whenRange = fmtTimeRange(reserva.fecha_inicio, reserva.fecha_fin)
  const whenDuration = fmtDuration(reserva.fecha_inicio, reserva.fecha_fin)
  const tipoLabel = recurso?.tipo
    ? TYPE_LABELS[recurso.tipo] || recurso.tipo
    : null

  const closeConfirm = () => setConfirmAction(null)

  const handleConfirm = async () => {
    if (!confirmAction) return
    try {
      if (confirmAction === 'approve') await onApprove(reserva.id)
      else if (confirmAction === 'cancel') await onCancelOwn(reserva)
      else if (confirmAction === 'force-delete') await onForceDelete(reserva)
      closeConfirm()
    } catch {
      /* parent sets actionError */
    }
  }

  const confirmConfig = {
    approve: {
      title: 'Confirmar aprobación',
      description: '¿Confirmar aprobación de la reserva?',
      confirmLabel: 'Aprobar',
      danger: false,
    },
    cancel: {
      title: 'Cancelar reserva',
      description: `¿Estás seguro de que deseas cancelar tu reserva "${reserva.titulo}"?`,
      confirmLabel: 'Cancelar reserva',
      danger: true,
    },
    'force-delete': {
      title: 'Eliminar permanentemente',
      description: `¿Eliminar PERMANENTEMENTE la reserva "${reserva.titulo}"? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      danger: true,
    },
  }[confirmAction]

  const footerStart = (
    <>
      {showCancelOwn ? (
        <Button
          type="button"
          size="sm"
          variant="danger-outline"
          title="Cancelar mi reserva"
          onClick={() => setConfirmAction('cancel')}
        >
          <Icon name="close" size={14} /> Cancelar
        </Button>
      ) : null}
      {showForceDelete ? (
        <Button
          type="button"
          size="sm"
          variant="danger"
          onClick={() => setConfirmAction('force-delete')}
        >
          <Icon name="trash" size={14} /> Eliminar
        </Button>
      ) : null}
    </>
  )

  const footerEnd = (
    <>
      {showApproveActions ? (
        <>
          <Button
            type="button"
            size="sm"
            variant="danger-outline"
            onClick={() => {
              setRechazandoId(reserva.id)
              setMotivoRechazo('')
            }}
          >
            <Icon name="close" size={14} /> Rechazar
          </Button>
          <Button
            type="button"
            size="sm"
            variant="primary"
            onClick={() => setConfirmAction('approve')}
          >
            <Icon name="check" size={14} /> Aprobar
          </Button>
        </>
      ) : null}
      {showFinalize ? (
        <Button
          type="button"
          size="sm"
          variant="primary"
          onClick={() => onFinalize(reserva.id)}
        >
          <Icon name="check" size={14} /> Finalizar
        </Button>
      ) : null}
    </>
  )

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        smoothSize={false}
        className={`modal--reservation${isBlocked ? ' reservation-modal--blocked' : ''}${isPending ? ' reservation-modal--pending' : ''}`}
        footerClassName={hasFooterActions ? 'modal__footer--reservation-actions' : undefined}
        ribbon={
          <div className="reservation-modal__ribbon" style={{ background: color }} aria-hidden />
        }
        title={reserva.titulo}
        headerActions={
          <div className="reservation-modal__badges">
            <Badge variant={badge.variant} className="reservation-modal__badge">
              {badge.label}
            </Badge>
            {isPast ? <Badge variant="neutral">Pasada</Badge> : null}
          </div>
        }
        afterHeader={
          <div className="reservation-modal__subheader">
            <p className="reservation-modal__meta">
              {recurso?.nombre || 'Recurso'}
              {tipoLabel ? ` · ${tipoLabel}` : ''}
            </p>
          </div>
        }
        footer={
          hasFooterActions ? (
            <>
              {footerStart}
              {footerEnd}
            </>
          ) : null
        }
      >
        {actionError ? (
          <Alert
            variant="danger"
            className="reservation-modal__alert"
            onClose={() => setActionError('')}
          >
            {actionError}
          </Alert>
        ) : null}

        {isPending && !isRechazando ? (
          <Alert
            variant="warning"
            title="Requiere revisión"
            className="reservation-modal__alert"
          >
            Revise los datos antes de aprobar o rechazar.
          </Alert>
        ) : null}

        <div className="reservation-modal__when">
          <div className="detail-field__label">Cuándo</div>
          <div className="reservation-modal__when-date">{whenDate}</div>
          <div className="reservation-modal__when-time">
            <span className="reservation-modal__when-range">{whenRange}</span>
            <span className="reservation-modal__when-sep" aria-hidden>
              ·
            </span>
            <span className="reservation-modal__when-duration">{whenDuration}</span>
          </div>
        </div>

        <div className="reservation-modal__details">
          <div className="detail-field">
            <div className="detail-field__label">Recurso</div>
            <div className="detail-field__value">
              <div className="detail-field__value-main">{recurso?.nombre || '—'}</div>
            </div>
          </div>

          <div className="detail-field">
            <div className="detail-field__label">Categoría</div>
            <div className="detail-field__value">
              <div className="detail-field__value-main">{tipoLabel || '—'}</div>
            </div>
          </div>

          <div className="detail-field">
            <div className="detail-field__label">Solicitante</div>
            <div className="detail-field__value">
              <div className="detail-field__value-main">{solicitanteNombre}</div>
              {showSolicitanteEmail ? (
                <div className="detail-field__value-sub">{solicitanteEmail}</div>
              ) : null}
            </div>
          </div>
        </div>

        {reserva.descripcion ? (
          <div className="reservation-modal__notes">
            <div className="detail-field__label">Observaciones</div>
            <p className="reservation-modal__notes-text">{reserva.descripcion}</p>
          </div>
        ) : null}

        {reserva.motivo_rechazo ? (
          <Alert variant="danger" className="reservation-modal__alert" title="Motivo de rechazo">
            {reserva.motivo_rechazo}
          </Alert>
        ) : null}

        {isRechazando ? (
          <div className="reservation-modal__reject-panel">
            <Field label="Motivo del rechazo">
              <Textarea
                autoFocus
                rows={3}
                value={motivoRechazo}
                onChange={(e) => setMotivoRechazo(e.target.value)}
                placeholder="Ej: El horario se superpone con otra actividad…"
              />
            </Field>
            <div className="reservation-modal__reject-actions">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setRechazandoId(null)
                  setMotivoRechazo('')
                }}
              >
                Volver
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={() => onReject(reserva.id, motivoRechazo)}
              >
                Confirmar rechazo
              </Button>
            </div>
          </div>
        ) : null}

        {isApproved && isPast ? (
          <Alert variant="neutral" className="reservation-modal__alert">
            Esta reserva ya finalizó su horario.
          </Alert>
        ) : null}
      </Modal>

      <ConfirmModal
        open={!!confirmAction}
        onClose={closeConfirm}
        onConfirm={handleConfirm}
        title={confirmConfig?.title || ''}
        description={confirmConfig?.description || ''}
        confirmLabel={confirmConfig?.confirmLabel || 'Confirmar'}
        danger={confirmConfig?.danger ?? true}
      />
    </>
  )
}
