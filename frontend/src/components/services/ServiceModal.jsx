import React, { useState, useEffect } from 'react'
import SearchableSelect from '../common/SearchableSelect'
import { Modal, Button, Field, Input, Select, Alert, useFormOverlay, formatApiFormError } from '@slep/ui'

const emptyForm = {
  proveedor: '',
  establecimiento: '',
  numero_cliente: '',
  numero_servicio: '',
  tipo_documento: '',
  unidad_medida: '',
}

const ServiceModal = ({
  open,
  onClose,
  onSave,
  editingId,
  initialData,
  lookups: { providers = [], establishments = [], documentTypes = [] } = {},
}) => {
  const [formData, setFormData] = useState(emptyForm)
  const overlay = useFormOverlay()

  useEffect(() => {
    if (!open) return
    overlay.reset()
    setFormData({
      proveedor: initialData?.proveedor || '',
      establecimiento: initialData?.establecimiento || '',
      numero_cliente: initialData?.numero_cliente || '',
      numero_servicio: initialData?.numero_servicio || '',
      tipo_documento: initialData?.tipo_documento || '',
      unidad_medida: initialData?.unidad_medida || '',
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset solo al abrir
  }, [open, initialData])

  const unidadSelectValue = ['', 'm3', 'kWh', 'Lts'].includes(formData.unidad_medida)
    ? formData.unidad_medida
    : 'custom'

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await overlay.run(
        async () => {
          await onSave(formData)
        },
        {
          successDescription: editingId ? 'Servicio actualizado.' : 'Servicio creado.',
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
      size="lg"
      title={editingId ? 'Editar servicio' : 'Nuevo servicio'}
      subheader="Vincule un establecimiento con proveedor y número de cliente"
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
            form="service-form"
            loading={overlay.busy}
            disabled={overlay.busy || overlay.active}
          >
            {editingId ? 'Actualizar' : 'Guardar'}
          </Button>
        </>
      }
    >
      <form id="service-form" className="crud-form" onSubmit={handleSubmit}>
        <p className="contracts-section-title">1. Vinculación</p>
        <div className="form-grid">
          <div className="field">
            <SearchableSelect
              label="Proveedor"
              required
              options={providers.map((p) => ({
                value: p.id,
                label: `${p.nombre}${p.rut ? ` (${p.rut})` : ''}`,
              }))}
              value={formData.proveedor}
              onChange={(val) => setFormData({ ...formData, proveedor: val })}
              placeholder="Seleccione proveedor…"
            />
          </div>
          <div className="field">
            <SearchableSelect
              label="Establecimiento"
              required
              options={establishments.map((e) => ({ value: e.id, label: e.nombre }))}
              value={formData.establecimiento}
              onChange={(val) => setFormData({ ...formData, establecimiento: val })}
              placeholder="Seleccione establecimiento…"
            />
          </div>
        </div>

        <p className="contracts-section-title">2. Códigos de facturación</p>
        <div className="form-grid">
          <Field label="Nº Cliente / Cuenta" required htmlFor="svc-cliente">
            <Input
              id="svc-cliente"
              required
              placeholder="ID único de pago…"
              value={formData.numero_cliente}
              onChange={(e) => setFormData({ ...formData, numero_cliente: e.target.value })}
            />
          </Field>
          <Field label="Nº Medidor / Servicio" htmlFor="svc-medidor">
            <Input
              id="svc-medidor"
              placeholder="Opcional…"
              value={formData.numero_servicio}
              onChange={(e) => setFormData({ ...formData, numero_servicio: e.target.value })}
            />
          </Field>
          <Field label="Tipo de documento" htmlFor="svc-doc">
            <Select
              id="svc-doc"
              value={formData.tipo_documento}
              onChange={(e) => setFormData({ ...formData, tipo_documento: e.target.value })}
            >
              <option value="">Seleccione…</option>
              {documentTypes.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Medición de consumo" htmlFor="svc-unidad">
            <Select
              id="svc-unidad"
              value={unidadSelectValue}
              onChange={(e) => {
                const val = e.target.value
                setFormData({
                  ...formData,
                  unidad_medida: val === 'custom' ? 'Otro' : val,
                })
              }}
            >
              <option value="">No registra consumo (costo fijo)</option>
              <option value="m3">m³ (Agua)</option>
              <option value="kWh">kWh (Electricidad)</option>
              <option value="Lts">Lts (Gas / combustible)</option>
              <option value="custom">Otro (personalizada)…</option>
            </Select>
          </Field>
          {unidadSelectValue === 'custom' ? (
            <Field
              label="Unidad personalizada"
              required
              htmlFor="svc-unidad-custom"
              className="field--full"
            >
              <Input
                id="svc-unidad-custom"
                required
                placeholder="Ej: Balones, Galones…"
                value={formData.unidad_medida === 'Otro' ? '' : formData.unidad_medida}
                onChange={(e) => setFormData({ ...formData, unidad_medida: e.target.value })}
              />
            </Field>
          ) : null}
        </div>

        <Alert variant="info">
          El número de cliente es el identificador principal en cargas masivas. Debe coincidir con
          la boleta del proveedor.
        </Alert>
      </form>
    </Modal>
  )
}

export default ServiceModal
