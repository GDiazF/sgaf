import React, { useState, useEffect } from 'react'
import api from '../../api'
import { useNotify } from '../../hooks/useNotify'
import {
  Modal,
  Button,
  Field,
  Input,
  Select,
  useFormOverlay,
  formatApiFormError,
} from '@slep/ui'

const RECIPIENT_TYPES = [
  { value: 'funcionario', label: 'Personal SLEP' },
  { value: 'externo', label: 'Externo / registrado' },
  { value: 'director', label: 'Director de establecimiento' },
]

/**
 * Traspaso de responsabilidad.
 * Props: open/isOpen, onClose, loan
 * API: POST prestamos/traspasar/ con { activos: [...] }
 */
const TransferModal = ({
  open,
  isOpen,
  onClose,
  loan,
}) => {
  const visible = open ?? isOpen
  const { notify } = useNotify()
  const overlay = useFormOverlay()
  const [establishments, setEstablishments] = useState([])
  const [applicants, setApplicants] = useState([])
  const [funcionarios, setFuncionarios] = useState([])

  const [recipientType, setRecipientType] = useState('funcionario')
  const [selectedApplicantId, setSelectedApplicantId] = useState('')
  const [selectedFuncionarioId, setSelectedFuncionarioId] = useState('')
  const [selectedDirectorEstId, setSelectedDirectorEstId] = useState('')
  const [observacion, setObservacion] = useState('')

  useEffect(() => {
    if (!visible) return
    overlay.reset()
    setRecipientType('funcionario')
    setSelectedApplicantId('')
    setSelectedFuncionarioId('')
    setSelectedDirectorEstId('')
    setObservacion('')
    const loadLookups = async () => {
      try {
        const [estRes, appRes, funcRes] = await Promise.all([
          api.get('establecimientos/', { params: { page_size: 1000 } }),
          api.get('solicitantes/', { params: { page_size: 1000 } }),
          api.get('funcionarios/', { params: { page_size: 1000 } }),
        ])
        setEstablishments(estRes.data.results || estRes.data || [])
        setApplicants(
          (appRes.data.results || appRes.data || []).filter((a) => !a.funcionario),
        )
        setFuncionarios(funcRes.data.results || funcRes.data || [])
      } catch (error) {
        console.error('Error loading lookups:', error)
        notify({
          variant: 'danger',
          text: 'Error al cargar catálogos para el traspaso.',
        })
      }
    }
    loadLookups()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset solo al abrir
  }, [visible])

  const activoId = loan?.activo ?? loan?.llave
  const activo = loan?.activo_obj || loan?.llave_obj

  const canSubmit =
    (recipientType === 'funcionario' && selectedFuncionarioId) ||
    (recipientType === 'externo' && selectedApplicantId) ||
    (recipientType === 'director' && selectedDirectorEstId)

  const handleRecipientTypeChange = (type) => {
    setRecipientType(type)
    setSelectedApplicantId('')
    setSelectedFuncionarioId('')
    setSelectedDirectorEstId('')
  }

  const handleTransfer = async () => {
    if (!canSubmit || !activoId) return
    try {
      await overlay.run(
        async () => {
          const payload = {
            activos: [activoId],
            solicitante: recipientType === 'externo' ? selectedApplicantId || null : null,
            funcionario: recipientType === 'funcionario' ? selectedFuncionarioId || null : null,
            director_establecimiento_id:
              recipientType === 'director' ? selectedDirectorEstId || null : null,
            observacion:
              observacion ||
              `Traspaso desde ${loan?.solicitante_obj?.nombre || 'usuario anterior'}`,
          }
          await api.post('prestamos/traspasar/', payload)
        },
        {
          successDescription: 'Traspaso realizado correctamente.',
          formatError: (err) => formatApiFormError(err, 'Error al realizar el traspaso.'),
        },
      )
    } catch {
      // FormOverlay
    }
  }

  const handleOverlayDismiss = () => {
    if (overlay.status === 'success') {
      overlay.reset()
      onClose?.({ saved: true })
      return
    }
    overlay.dismiss()
  }

  const handleClose = () => {
    if (overlay.busy) return
    overlay.reset()
    onClose?.()
  }

  return (
    <Modal
      open={!!visible}
      onClose={handleClose}
      title="Traspasar activo"
      subheader="Cambiar responsable del activo en préstamo"
      {...overlay.modalProps}
      onOverlayDismiss={handleOverlayDismiss}
      footer={
        <>
          <Button variant="quiet" onClick={handleClose} disabled={overlay.busy}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleTransfer}
            loading={overlay.busy}
            disabled={!canSubmit || overlay.busy || overlay.active}
          >
            {overlay.busy ? 'Traspasando…' : 'Ejecutar traspaso'}
          </Button>
        </>
      }
    >
      <div className="loans-transfer">
        <div className="loans-return__card">
          <span>Activo actual</span>
          <strong>{activo?.nombre || '—'}</strong>
          <p>
            En posesión de:{' '}
            <strong>
              {loan?.solicitante_obj?.nombre} {loan?.solicitante_obj?.apellido}
            </strong>
          </p>
        </div>

        <fieldset className="loan-form-recipient">
          <legend className="loan-form-recipient__legend">Nuevo responsable</legend>
          <div className="loan-form-recipient__radios" role="radiogroup" aria-label="Tipo de responsable">
            {RECIPIENT_TYPES.map((opt) => (
              <label key={opt.value} className="radio">
                <input
                  type="radio"
                  name="transfer-recipient-type"
                  className="no-global"
                  value={opt.value}
                  checked={recipientType === opt.value}
                  onChange={() => handleRecipientTypeChange(opt.value)}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </fieldset>

        {recipientType === 'funcionario' ? (
          <Field label="Personal SLEP" htmlFor="tr-func">
            <Select
              id="tr-func"
              value={selectedFuncionarioId}
              onChange={(e) => setSelectedFuncionarioId(e.target.value)}
            >
              <option value="">Buscar / seleccionar funcionario…</option>
              {funcionarios.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nombre_funcionario} ({f.cargo || 'Funcionario'})
                </option>
              ))}
            </Select>
          </Field>
        ) : null}

        {recipientType === 'externo' ? (
          <Field label="Externos o registrados" htmlFor="tr-app">
            <Select
              id="tr-app"
              value={selectedApplicantId}
              onChange={(e) => setSelectedApplicantId(e.target.value)}
            >
              <option value="">Buscar por RUT o nombre…</option>
              {applicants.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre} {a.apellido} ({a.rut})
                </option>
              ))}
            </Select>
          </Field>
        ) : null}

        {recipientType === 'director' ? (
          <Field label="Director de establecimiento" htmlFor="tr-dir">
            <Select
              id="tr-dir"
              value={selectedDirectorEstId}
              onChange={(e) => setSelectedDirectorEstId(e.target.value)}
            >
              <option value="">Seleccionar escuela…</option>
              {establishments.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre} ({e.rbd})
                </option>
              ))}
            </Select>
          </Field>
        ) : null}

        <Field label="Observación (opcional)" htmlFor="tr-obs">
          <Input
            id="tr-obs"
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            placeholder="Motivo del traspaso…"
          />
        </Field>
      </div>
    </Modal>
  )
}

export default TransferModal
