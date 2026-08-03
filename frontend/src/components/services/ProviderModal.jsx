import React, { useState, useEffect } from 'react'
import { Modal, Button, Field, Input, Select, Textarea, Alert, useFormOverlay, formatApiFormError } from '@slep/ui'

const emptyForm = {
  nombre: '',
  rut: '',
  acronimo: '',
  tipo_proveedor: '',
  contacto: '',
}

const ProviderModal = ({
  open,
  onClose,
  onSave,
  editingId,
  initialData,
  lookups: { providerTypes = [] } = {},
}) => {
  const [formData, setFormData] = useState(emptyForm)
  const overlay = useFormOverlay()

  useEffect(() => {
    if (!open) return
    overlay.reset()
    setFormData(initialData ? { ...emptyForm, ...initialData } : emptyForm)
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
          successDescription: editingId ? 'Proveedor actualizado.' : 'Proveedor registrado.',
          formatError: formatApiFormError,
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
      title={editingId ? 'Editar proveedor' : 'Nuevo proveedor'}
      subheader="Empresas prestadoras de servicios básicos o críticos"
      size="lg"
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
            form="provider-form"
            loading={overlay.busy}
            disabled={overlay.busy || overlay.active}
          >
            {editingId ? 'Actualizar' : 'Registrar'}
          </Button>
        </>
      }
    >
      <form id="provider-form" className="crud-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <Field
            label="Razón social / Nombre"
            required
            htmlFor="prov-nombre"
            className="field--full"
          >
            <Input
              id="prov-nombre"
              required
              placeholder="Ej: Compañía General de Electricidad S.A."
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            />
          </Field>

          <Field label="RUT empresa" htmlFor="prov-rut">
            <Input
              id="prov-rut"
              placeholder="Ej: 76.123.456-7"
              value={formData.rut}
              onChange={(e) => setFormData({ ...formData, rut: e.target.value })}
            />
          </Field>

          <Field label="Acrónimo / Sigla" htmlFor="prov-acronimo">
            <Input
              id="prov-acronimo"
              placeholder="Ej: CGE"
              value={formData.acronimo}
              onChange={(e) => setFormData({ ...formData, acronimo: e.target.value })}
            />
          </Field>

          <Field label="Giro / Tipo" htmlFor="prov-tipo" className="field--full">
            <Select
              id="prov-tipo"
              value={formData.tipo_proveedor}
              onChange={(e) => setFormData({ ...formData, tipo_proveedor: e.target.value })}
            >
              <option value="">Seleccione el tipo…</option>
              {providerTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                  {t.acronimo_nemotecnico ? ` (${t.acronimo_nemotecnico})` : ''}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Contacto y dirección" htmlFor="prov-contacto" className="field--full">
            <Textarea
              id="prov-contacto"
              rows={2}
              placeholder="Dirección comercial, teléfonos, ejecutivos de cuenta…"
              value={formData.contacto}
              onChange={(e) => setFormData({ ...formData, contacto: e.target.value })}
            />
          </Field>
        </div>

        <Alert variant="info">
          El acrónimo se usa en vistas compactas y reportes. Elija una sigla fácil de reconocer.
        </Alert>
      </form>
    </Modal>
  )
}

export default ProviderModal
