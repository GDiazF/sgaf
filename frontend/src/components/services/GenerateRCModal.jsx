import React, { useEffect } from 'react'
import { Modal, Button, Field, Select, Alert, useFormOverlay, formatApiFormError } from '@slep/ui'

const GenerateRCModal = ({
  open,
  onClose,
  selectedCount = 0,
  groups = [],
  form,
  onChange,
  onSave,
}) => {
  const overlay = useFormOverlay()
  const selectedGroup = groups.find((g) => String(g.id) === String(form?.grupo_firmante))
  const members = selectedGroup?.miembros_detalle || []

  useEffect(() => {
    if (!open) return
    overlay.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset solo al abrir
  }, [open])

  const handleClose = () => {
    if (overlay.busy) return
    overlay.reset()
    onClose?.()
  }

  const handleOverlayDismiss = () => {
    if (overlay.status === 'success') {
      overlay.reset()
      onClose?.({ saved: true })
      return
    }
    overlay.dismiss()
  }

  const handleConfirm = async () => {
    if (!form?.firmante) {
      overlay.setTitle(undefined)
      overlay.setDescription('Debe seleccionar un firmante.')
      overlay.setStatus('error')
      return
    }
    try {
      await overlay.run(
        async () => {
          await onSave(form)
        },
        {
          successDescription:
            'Recepción conforme generada y enviada a la bandeja de firmas del firmante.',
          formatError: (err) => formatApiFormError(err),
        },
      )
    } catch {
      // El error se muestra en FormOverlay
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      size="md"
      title="Generar recepción conforme"
      subheader={`Se procesarán ${selectedCount} pago${selectedCount === 1 ? '' : 's'} seleccionado${selectedCount === 1 ? '' : 's'}`}
      {...overlay.modalProps}
      onOverlayDismiss={handleOverlayDismiss}
      footer={
        <>
          <Button variant="ghost" type="button" onClick={handleClose} disabled={overlay.busy}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            type="button"
            onClick={handleConfirm}
            loading={overlay.busy}
            disabled={overlay.busy || overlay.active || !form?.firmante}
          >
            Generar documento
          </Button>
        </>
      }
    >
      <div className="crud-form">
        <Field label="Grupo de firmante" required htmlFor="rc-grupo">
          <Select
            id="rc-grupo"
            value={form?.grupo_firmante || ''}
            onChange={(e) => {
              const gid = e.target.value
              const grp = groups.find((g) => String(g.id) === gid)
              onChange?.({
                grupo_firmante: gid,
                firmante: grp?.jefe || '',
              })
            }}
          >
            <option value="">Seleccione grupo…</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nombre}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Firmante" required htmlFor="rc-firmante">
          <Select
            id="rc-firmante"
            value={form?.firmante || ''}
            disabled={!form?.grupo_firmante}
            onChange={(e) => onChange?.({ ...form, firmante: e.target.value })}
          >
            <option value="">Seleccione firmante…</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
                {m.id === selectedGroup?.jefe ? ' (jefe)' : ''}
              </option>
            ))}
          </Select>
        </Field>

        <Alert variant="info">
          Se creará un PDF con logos institucionales y la firma del funcionario seleccionado.
        </Alert>
      </div>
    </Modal>
  )
}

export default GenerateRCModal
