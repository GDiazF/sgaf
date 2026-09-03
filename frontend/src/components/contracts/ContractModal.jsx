import React, { useState, useEffect } from 'react'
import {
  Modal,
  Button,
  Icon,
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
  const overlay = useFormOverlay()

  useEffect(() => {
    if (!open) return
    overlay.reset()
    if (initialData) setFormData(initialData)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset solo al abrir
  }, [open, initialData])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await overlay.run(
        async () => {
          await onSave(formData)
        },
        {
          successDescription: editingId ? 'Contrato actualizado.' : 'Contrato creado.',
          formatError: (err) => formatApiFormError(err),
        },
      )
    } catch {
      // El error se muestra en FormOverlay
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
  )
}

export default ContractModal
