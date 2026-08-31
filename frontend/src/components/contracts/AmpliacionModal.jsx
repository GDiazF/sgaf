import React, { useEffect, useState } from 'react'
import {
  Modal,
  Button,
  Field,
  Input,
  Textarea,
  FileInput,
  FormStatus,
  CurrencyInput,
  Badge,
  Icon,
  useFormOverlay,
  formatApiFormError,
} from '@slep/ui'

const emptyForm = (contract, editing) => ({
  fecha_inicio: editing?.fecha_inicio || contract?.fecha_termino || '',
  fecha_termino: editing?.fecha_termino || '',
  nro_resolucion: editing?.nro_resolucion || '',
  motivo: editing?.motivo || '',
  monto: editing?.monto ?? '',
  porcentaje: editing?.porcentaje ?? '',
  documento: null,
  eliminar_documento: false,
})

const fileNameFromUrl = (url) => {
  if (!url || typeof url !== 'string') return 'Documento adjunto'
  try {
    const raw = decodeURIComponent(url.split('?')[0].split('/').pop() || '')
    return raw || 'Documento adjunto'
  } catch {
    return 'Documento adjunto'
  }
}

const AmpliacionModal = ({ open, onClose, onSave, contract, editing = null }) => {
  const overlay = useFormOverlay()
  const isEdit = Boolean(editing?.id)
  const terminoVigente = contract?.fecha_termino || ''
  const [form, setForm] = useState(emptyForm(contract, editing))

  useEffect(() => {
    if (!open) return
    overlay.reset()
    setForm(emptyForm(contract, editing))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset solo al abrir
  }, [open, contract?.id, contract?.fecha_termino, editing])

  const existingDocUrl =
    !form.eliminar_documento && editing?.documento && !(form.documento instanceof File)
      ? editing.documento
      : null
  const existingDocName = existingDocUrl ? fileNameFromUrl(existingDocUrl) : null

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await overlay.run(
        async () => {
          await onSave(form, editing)
        },
        {
          successDescription: isEdit
            ? 'Ampliación actualizada.'
            : 'Ampliación registrada. La vigencia del contrato se actualizó.',
          formatError: (err) => formatApiFormError(err),
        },
      )
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
    <Modal
      open={open}
      onClose={handleClose}
      size="md"
      title={isEdit ? 'Editar ampliación' : 'Ampliación de contrato'}
      subheader={`Contrato ${contract?.codigo_mercado_publico || ''}`}
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
            form="ampliacion-form"
            loading={overlay.busy}
            disabled={overlay.busy || overlay.active}
          >
            {isEdit ? 'Guardar cambios' : 'Registrar ampliación'}
          </Button>
        </>
      }
    >
      <form id="ampliacion-form" className="crud-form" onSubmit={handleSubmit}>
        <FormStatus
          variant="info"
          title={isEdit ? 'Editar ampliación' : 'Vigencia del contrato'}
          description={
            isEdit
              ? `Término previo al registrar: ${editing?.fecha_termino_anterior ? new Date(editing.fecha_termino_anterior).toLocaleDateString('es-CL') : '—'}. Al cambiar fechas se recalcula la vigencia del contrato.`
              : terminoVigente
                ? `Término vigente actual: ${new Date(terminoVigente).toLocaleDateString('es-CL')}. Al guardar, el contrato pasará a la nueva fecha de término.`
                : 'Sin fecha de término vigente.'
          }
        />
        <div className="form-grid">
          <Field
            label="Inicio de la ampliación"
            required
            htmlFor="amp-inicio"
            hint="Por defecto es el término vigente; puedes cambiarlo si la ampliación no es continua."
          >
            <Input
              id="amp-inicio"
              type="date"
              required
              value={form.fecha_inicio || ''}
              onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })}
            />
          </Field>
          <Field label="Nuevo término" required htmlFor="amp-termino">
            <Input
              id="amp-termino"
              type="date"
              required
              value={form.fecha_termino || ''}
              onChange={(e) => setForm({ ...form, fecha_termino: e.target.value })}
            />
          </Field>
          <Field label="N° resolución / referencia" htmlFor="amp-res" className="field--full">
            <Input
              id="amp-res"
              placeholder="Opcional"
              value={form.nro_resolucion || ''}
              onChange={(e) => setForm({ ...form, nro_resolucion: e.target.value })}
            />
          </Field>
          <Field
            label="Monto de la ampliación"
            htmlFor="amp-monto"
            hint="Opcional. Monto adicional asociado a esta ampliación."
          >
            <CurrencyInput
              id="amp-monto"
              value={form.monto ?? ''}
              onChange={(val) => setForm({ ...form, monto: val })}
            />
          </Field>
          <Field
            label="% de ampliación"
            htmlFor="amp-pct"
            hint="Informativo (ej. 30). No se usa para calcular montos."
          >
            <Input
              id="amp-pct"
              type="number"
              step="0.01"
              min="0"
              placeholder="Ej: 30"
              value={form.porcentaje ?? ''}
              onChange={(e) => setForm({ ...form, porcentaje: e.target.value })}
            />
          </Field>
          <Field label="Motivo / glosa" htmlFor="amp-motivo" className="field--full">
            <Textarea
              id="amp-motivo"
              rows={3}
              placeholder="Opcional"
              value={form.motivo || ''}
              onChange={(e) => setForm({ ...form, motivo: e.target.value })}
            />
          </Field>
          <Field
            label="Documento de ampliación"
            htmlFor="amp-doc"
            className="field--full"
            hint={
              existingDocName
                ? 'Puedes reemplazarlo subiendo otro archivo, o eliminarlo.'
                : form.eliminar_documento
                  ? 'El documento actual se eliminará al guardar. También puedes subir uno nuevo.'
                  : isEdit
                    ? 'Opcional. Sube un archivo para adjuntarlo a esta ampliación.'
                    : 'Opcional. También quedará en la pestaña Archivos del contrato.'
            }
          >
            {existingDocName ? (
              <ul className="ticket-file-list">
                <li>
                  <Badge variant="accent">{existingDocName}</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    aria-label={`Eliminar ${existingDocName}`}
                    disabled={overlay.busy}
                    onClick={() =>
                      setForm({
                        ...form,
                        documento: null,
                        eliminar_documento: true,
                      })
                    }
                  >
                    <Icon name="close" size={14} />
                  </Button>
                </li>
              </ul>
            ) : null}
            {form.eliminar_documento && !form.documento ? (
              <FormStatus
                variant="warning"
                title="Documento marcado para eliminar"
                description="Se quitará de la ampliación y del expediente al guardar. Puedes deshacer o subir un reemplazo."
              />
            ) : null}
            {form.eliminar_documento && !form.documento ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={overlay.busy}
                onClick={() => setForm({ ...form, eliminar_documento: false })}
              >
                Conservar documento actual
              </Button>
            ) : null}
            <FileInput
              id="amp-doc"
              label={existingDocName ? 'Reemplazar archivo' : 'Seleccionar archivo'}
              accept=".pdf,.doc,.docx,image/*"
              onChange={(e) =>
                setForm({
                  ...form,
                  documento: e.target.files?.[0] || null,
                  eliminar_documento: false,
                })
              }
            />
          </Field>
        </div>
      </form>
    </Modal>
  )
}

export default AmpliacionModal
