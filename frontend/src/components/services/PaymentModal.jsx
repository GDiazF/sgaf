import React, { useState, useEffect } from 'react'
import SearchableSelect from '../common/SearchableSelect'
import { Modal, Button, Field, Input, Alert, useFormOverlay, formatApiFormError } from '@slep/ui'

const emptyForm = {
  servicio: '',
  establecimiento: '',
  fecha_emision: '',
  fecha_vencimiento: '',
  fecha_pago: '',
  nro_documento: '',
  monto_interes: 0,
  monto_total: '',
  consumo: '',
}

const PaymentModal = ({
  open,
  onClose,
  onSave,
  editingId,
  initialData,
  lookups: { establishments = [], services = [] } = {},
}) => {
  const [formData, setFormData] = useState(emptyForm)
  const overlay = useFormOverlay()

  useEffect(() => {
    if (!open) return
    overlay.reset()
    setFormData({
      servicio: initialData?.servicio || '',
      establecimiento: initialData?.establecimiento || '',
      fecha_emision: initialData?.fecha_emision || '',
      fecha_vencimiento: initialData?.fecha_vencimiento || '',
      fecha_pago: initialData?.fecha_pago || '',
      nro_documento: initialData?.nro_documento || '',
      monto_interes: initialData?.monto_interes ?? 0,
      monto_total: initialData?.monto_total ?? '',
      consumo: initialData?.consumo ?? '',
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset solo al abrir
  }, [open, initialData])

  const filteredServices = formData.establecimiento
    ? services.filter((s) => s.establecimiento === parseInt(formData.establecimiento, 10))
    : []

  const selectedService = services.find((s) => s.id === parseInt(formData.servicio, 10))
  const unidadMedida = selectedService?.unidad_medida

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await overlay.run(
        async () => {
          await onSave(formData)
        },
        {
          successDescription: editingId ? 'Pago actualizado.' : 'Pago registrado.',
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
      title={editingId ? 'Editar registro de pago' : 'Registrar pago / consumo'}
      subheader="Ingrese los datos de facturación recibidos del proveedor"
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
            form="payment-form"
            loading={overlay.busy}
            disabled={overlay.busy || overlay.active}
          >
            {editingId ? 'Actualizar' : 'Registrar pago'}
          </Button>
        </>
      }
    >
      <form id="payment-form" className="crud-form" onSubmit={handleSubmit}>
        <p className="contracts-section-title">1. Contexto del servicio</p>
        <div className="form-grid">
          <div className="field">
            <SearchableSelect
              label="Establecimiento"
              required
              options={establishments.map((e) => ({ value: e.id, label: e.nombre }))}
              value={formData.establecimiento}
              onChange={(val) => setFormData({ ...formData, establecimiento: val, servicio: '' })}
              placeholder="Seleccione establecimiento…"
            />
          </div>
          <div className="field">
            <SearchableSelect
              label="Servicio / ID cliente"
              required
              options={filteredServices.map((s) => ({
                value: s.id,
                label: `${s.proveedor_nombre} — ID: ${s.numero_cliente}`,
              }))}
              value={formData.servicio}
              onChange={(val) => setFormData({ ...formData, servicio: val })}
              placeholder={
                formData.establecimiento
                  ? 'Seleccione servicio…'
                  : 'Primero elija establecimiento'
              }
              disabled={!formData.establecimiento}
            />
          </div>
        </div>

        <p className="contracts-section-title">2. Detalles del documento</p>
        <div className="form-grid">
          <Field label="Nº documento / folio" required htmlFor="pay-doc">
            <Input
              id="pay-doc"
              required
              placeholder="Folio de factura/boleta…"
              value={formData.nro_documento}
              onChange={(e) => setFormData({ ...formData, nro_documento: e.target.value })}
            />
          </Field>
          <Field label="Monto total ($)" required htmlFor="pay-monto">
            <Input
              id="pay-monto"
              type="number"
              required
              placeholder="Ej: 45000"
              value={formData.monto_total}
              onChange={(e) => setFormData({ ...formData, monto_total: e.target.value })}
            />
          </Field>
          <Field label="Interés / multa (opcional)" htmlFor="pay-interes">
            <Input
              id="pay-interes"
              type="number"
              placeholder="0"
              value={formData.monto_interes}
              onChange={(e) => setFormData({ ...formData, monto_interes: e.target.value })}
            />
          </Field>
          {unidadMedida ? (
            <Field label={`Consumo (${unidadMedida})`} htmlFor="pay-consumo">
              <Input
                id="pay-consumo"
                type="number"
                step="any"
                placeholder={`Lectura en ${unidadMedida}…`}
                value={formData.consumo}
                onChange={(e) => setFormData({ ...formData, consumo: e.target.value })}
              />
            </Field>
          ) : null}
        </div>

        <p className="contracts-section-title">3. Cronología del cobro</p>
        <div className="form-grid">
          <Field label="Fecha emisión" required htmlFor="pay-emision">
            <Input
              id="pay-emision"
              type="date"
              required
              value={formData.fecha_emision}
              onChange={(e) => setFormData({ ...formData, fecha_emision: e.target.value })}
            />
          </Field>
          <Field label="Fecha vencimiento" required htmlFor="pay-venc">
            <Input
              id="pay-venc"
              type="date"
              required
              value={formData.fecha_vencimiento}
              onChange={(e) => setFormData({ ...formData, fecha_vencimiento: e.target.value })}
            />
          </Field>
          <Field label="Fecha de pago" required htmlFor="pay-pago">
            <Input
              id="pay-pago"
              type="date"
              required
              value={formData.fecha_pago}
              onChange={(e) => setFormData({ ...formData, fecha_pago: e.target.value })}
            />
          </Field>
        </div>

        <Alert variant="info">
          El monto total debe incluir IVA y cargos adicionales. Si el pago ya tiene recepción
          conforme, la edición puede quedar bloqueada según políticas de integridad.
        </Alert>
      </form>
    </Modal>
  )
}

export default PaymentModal
