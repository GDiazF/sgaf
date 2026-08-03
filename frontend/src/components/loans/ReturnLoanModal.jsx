import React from 'react'
import {
  Modal,
  Button,
  Alert,
  Icon,
} from '@slep/ui'

const formatDate = (dateString) => {
  if (!dateString) return '—'
  const date = new Date(dateString)
  return `${date.toLocaleDateString('es-CL')} ${date.toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
  })}`
}

/**
 * Confirmación de devolución de activo.
 * Props: open/isOpen, onClose, onConfirm(id), loanData
 */
const ReturnLoanModal = ({
  open,
  isOpen,
  onClose,
  onConfirm,
  loanData,
  confirming = false,
}) => {
  const visible = open ?? isOpen
  if (!loanData) return null

  const activo = loanData.activo_obj || loanData.llave_obj

  return (
    <Modal
      open={!!visible}
      onClose={() => {
        if (!confirming) onClose?.()
      }}
      title="Confirmar devolución"
      subheader="Registre la entrega física del activo en inventario"
      footer={
        <>
          <Button variant="quiet" onClick={onClose} disabled={confirming}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={() => onConfirm?.(loanData.id)}
            disabled={confirming}
          >
            {confirming ? 'Confirmando…' : 'Confirmar devolución'}
          </Button>
        </>
      }
    >
      <div className="loans-return">
        <Alert variant="warning" title="Atención">
          Al confirmar, el activo volverá a figurar como disponible. Asegúrese de
          haberlo recibido físicamente.
        </Alert>

        <div className="loans-return__card">
          <div className="loans-return__card-head">
            <Icon name="box" size={18} />
            <div>
              <span>Activo en préstamo</span>
              <strong>{activo?.nombre || '—'}</strong>
            </div>
          </div>
          <p>{activo?.establecimiento_nombre || 'Sin establecimiento'}</p>
        </div>

        <div className="loans-return__grid">
          <div className="loans-return__card">
            <span>Solicitante</span>
            <strong>
              {loanData.solicitante_obj?.nombre}{' '}
              {loanData.solicitante_obj?.apellido}
            </strong>
          </div>
          <div className="loans-return__card">
            <span>Fecha retirada</span>
            <strong>{formatDate(loanData.fecha_prestamo)}</strong>
          </div>
        </div>

        {loanData.observacion ? (
          <div className="loans-return__card">
            <span>Observación original</span>
            <p className="loans-return__obs">“{loanData.observacion}”</p>
          </div>
        ) : null}
      </div>
    </Modal>
  )
}

export default ReturnLoanModal
