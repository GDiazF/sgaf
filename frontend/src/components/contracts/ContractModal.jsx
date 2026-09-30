import React, { useState, useEffect } from 'react'
import {
  Modal,
  Button,
  ConfirmModal,
  useFormOverlay,
  formatApiFormError,
} from '@slep/ui'
import ContractForm from './ContractForm'

const ContractModal = ({
  open,
  onClose,
  onSave,
  editingId,
  initialData,
  lookups = {},
}) => {
  const [formData, setFormData] = useState({})
  const [confirmPlantillaOpen, setConfirmPlantillaOpen] = useState(false)
  const [pendingSubmit, setPendingSubmit] = useState(null)
  const overlay = useFormOverlay()

  const initialPlantilla = initialData?.plantilla_cobro || ''

  useEffect(() => {
    if (!open) return
    overlay.reset()
    setConfirmPlantillaOpen(false)
    setPendingSubmit(null)
    if (initialData) setFormData(initialData)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset solo al abrir
  }, [open, initialData])

  const plantillaCambio =
    Boolean(editingId) &&
    Boolean(formData.plantilla_cobro) &&
    String(formData.plantilla_cobro || '') !== String(initialPlantilla || '')

  const runSave = async (data, { confirmarPlantilla = false } = {}) => {
    await overlay.run(
      async () => {
        await onSave(data, { confirmarCambioPlantilla: confirmarPlantilla })
      },
      {
        successDescription: editingId ? 'Contrato actualizado.' : 'Contrato creado.',
        formatError: (err) => formatApiFormError(err),
      },
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (plantillaCambio) {
        setPendingSubmit({ ...formData })
        setConfirmPlantillaOpen(true)
        return
      }
      await runSave(formData, { confirmarPlantilla: false })
    } catch {
      // FormOverlay
    }
  }

  const handleConfirmPlantilla = async () => {
    const data = pendingSubmit || formData
    setConfirmPlantillaOpen(false)
    setPendingSubmit(null)
    try {
      await runSave(data, { confirmarPlantilla: true })
    } catch {
      // FormOverlay
    }
  }

  const handleOverlayDismiss = () => {
    if (overlay.status === 'success') {
      overlay.reset()
      onClose({ saved: true })
      return
    }
    overlay.dismiss()
  }

  const handleClose = () => {
    if (overlay.busy) return
    overlay.reset()
    onClose()
  }

  return (
    <>
      <Modal
        open={open}
        onClose={handleClose}
        size="lg"
        title={editingId ? 'Editar contrato' : 'Nuevo contrato'}
        subheader="Detalles del proceso de compra"
        {...overlay.modalProps}
        onOverlayDismiss={handleOverlayDismiss}
        footer={
          <>
            <Button variant="ghost" type="button" onClick={handleClose} disabled={overlay.busy}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="contract-form"
              loading={overlay.busy}
              disabled={overlay.busy || overlay.active}
            >
              {editingId ? 'Actualizar' : 'Guardar'}
            </Button>
          </>
        }
      >
        <ContractForm
          formId="contract-form"
          formData={formData}
          setFormData={setFormData}
          lookups={lookups}
          isDraft={false}
          editingId={editingId}
          onSubmit={handleSubmit}
        />
      </Modal>

      <ConfirmModal
        open={confirmPlantillaOpen}
        onClose={() => {
          setConfirmPlantillaOpen(false)
          setPendingSubmit(null)
        }}
        onConfirm={handleConfirmPlantilla}
        title="Cambiar plantilla de cobro"
        description={
          'La gestión operativa actual pasará a historial (solo lectura: rutas, periodos y cobros). ' +
          'Se abrirá una gestión nueva vacía con la plantilla elegida. Esta acción no se puede deshacer.'
        }
        confirmLabel="Cambiar y archivar gestión"
        danger
        cancelLabel="Cancelar"
      />
    </>
  )
}

export default ContractModal
