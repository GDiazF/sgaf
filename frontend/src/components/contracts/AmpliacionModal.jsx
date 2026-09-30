import React, { useEffect, useMemo, useState } from 'react'
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
  InfoTip,
  Select,
  useFormOverlay,
  formatApiFormError,
} from '@slep/ui'

const buildInitialRows = (contract, editing) => {
  const fromEditing = editing?.montos_proveedor || []
  if (fromEditing.length) {
    return fromEditing.map((m) => ({
      proveedor: String(m.proveedor),
      monto: m.monto ?? '',
    }))
  }
  // Legado: un solo monto global y un solo proveedor del contrato
  const proveedores = contract?.proveedores_asociados || []
  if (editing?.monto && proveedores.length === 1) {
    return [{ proveedor: String(proveedores[0].proveedor), monto: editing.monto }]
  }
  return []
}

const emptyForm = (contract, editing) => ({
  fecha_inicio: editing?.fecha_inicio || contract?.fecha_termino || '',
  fecha_termino: editing?.fecha_termino || '',
  nro_resolucion: editing?.nro_resolucion || '',
  motivo: editing?.motivo || '',
  monto: editing?.monto ?? '',
  porcentaje: editing?.porcentaje ?? '',
  montos_rows: buildInitialRows(contract, editing),
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
  const proveedores = contract?.proveedores_asociados || []

  useEffect(() => {
    if (!open) return
    overlay.reset()
    setForm(emptyForm(contract, editing))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset solo al abrir
  }, [open, contract?.id, contract?.fecha_termino, editing])

  const usedProveedorIds = useMemo(
    () => new Set((form.montos_rows || []).map((r) => String(r.proveedor)).filter(Boolean)),
    [form.montos_rows],
  )

  const disponiblesParaAgregar = useMemo(
    () => proveedores.filter((pa) => !usedProveedorIds.has(String(pa.proveedor))),
    [proveedores, usedProveedorIds],
  )

  const totalMontos = useMemo(
    () => (form.montos_rows || []).reduce((sum, r) => sum + (Number(r.monto) || 0), 0),
    [form.montos_rows],
  )

  const existingDocUrl =
    !form.eliminar_documento && editing?.documento && !(form.documento instanceof File)
      ? editing.documento
      : null
  const existingDocName = existingDocUrl ? fileNameFromUrl(existingDocUrl) : null

  const vigenciaTip = isEdit
    ? `Término previo al registrar: ${
        editing?.fecha_termino_anterior
          ? new Date(editing.fecha_termino_anterior).toLocaleDateString('es-CL')
          : '—'
      }. Al cambiar fechas se recalcula la vigencia del contrato.`
    : terminoVigente
      ? `Término vigente actual: ${new Date(terminoVigente).toLocaleDateString('es-CL')}. Al guardar, el contrato pasa a la nueva fecha de término.`
      : 'Sin fecha de término vigente.'

  const handleAddRow = () => {
    const next = disponiblesParaAgregar[0]
    if (!next) return
    setForm((prev) => ({
      ...prev,
      montos_rows: [...(prev.montos_rows || []), { proveedor: String(next.proveedor), monto: '' }],
    }))
  }

  const handleRemoveRow = (index) => {
    setForm((prev) => ({
      ...prev,
      montos_rows: (prev.montos_rows || []).filter((_, i) => i !== index),
    }))
  }

  const handleRowChange = (index, field, value) => {
    setForm((prev) => {
      const next = [...(prev.montos_rows || [])]
      next[index] = { ...next[index], [field]: value }
      return { ...prev, montos_rows: next }
    })
  }

  const optionsForRow = (row) => {
    const current = String(row.proveedor || '')
    return proveedores.filter(
      (pa) =>
        String(pa.proveedor) === current || !usedProveedorIds.has(String(pa.proveedor)),
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await overlay.run(
        async () => {
          await onSave(
            {
              ...form,
              montos_proveedor: (form.montos_rows || [])
                .filter((r) => r.proveedor && r.monto !== '' && r.monto != null)
                .map((r) => ({
                  proveedor: r.proveedor,
                  monto: r.monto,
                })),
            },
            editing,
          )
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
      size="lg"
      title={isEdit ? 'Editar ampliación' : 'Ampliación de contrato'}
      subheader={
        <span className="field__label-row">
          Contrato {contract?.codigo_mercado_publico || contract?.id || '—'}
          <InfoTip label="Vigencia">{vigenciaTip}</InfoTip>
        </span>
      }
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
        <div className="form-grid form-grid--align-end">
          <Field
            label="Inicio de la ampliación"
            required
            htmlFor="amp-inicio"
            tip="Por defecto es el término vigente; cámbialo solo si la ampliación no es continua."
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

          <div className="field field--full">
            <div className="contracts-section-head">
              <p className="contracts-section-title field__label-row">
                Monto por proveedor
                <InfoTip label="Montos por proveedor">
                  {proveedores.length
                    ? 'Opcional. Añade solo los proveedores del contrato a los que corresponde monto de ampliación. El total se calcula solo.'
                    : 'Este contrato no tiene proveedores asociados.'}
                </InfoTip>
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAddRow}
                disabled={!disponiblesParaAgregar.length}
              >
                <Icon name="plus" size="sm" /> Añadir
              </Button>
            </div>
            {(form.montos_rows || []).length === 0 ? (
              <p className="contracts-empty-hint">
                Sin montos por proveedor. Use «Añadir» si corresponde.
              </p>
            ) : (
              <div className="contracts-providers-list">
                {(form.montos_rows || []).map((row, index) => {
                  const opts = optionsForRow(row)
                  return (
                    <div key={`${row.proveedor}-${index}`} className="contracts-provider-card">
                      <div className="contracts-provider-card__head">
                        <span>Proveedor {index + 1}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveRow(index)}
                          aria-label="Quitar proveedor"
                        >
                          <Icon name="trash" size="sm" />
                        </Button>
                      </div>
                      <div className="form-grid">
                        <Field label="Proveedor" htmlFor={`amp-prov-${index}`} className="field--full">
                          <Select
                            id={`amp-prov-${index}`}
                            required
                            value={row.proveedor || ''}
                            onChange={(e) => handleRowChange(index, 'proveedor', e.target.value)}
                          >
                            <option value="">Seleccione…</option>
                            {opts.map((pa) => (
                              <option key={pa.proveedor} value={String(pa.proveedor)}>
                                {pa.proveedor_nombre || `Proveedor #${pa.proveedor}`}
                              </option>
                            ))}
                          </Select>
                        </Field>
                        <Field label="Monto ampliación ($)" htmlFor={`amp-monto-${index}`}>
                          <CurrencyInput
                            id={`amp-monto-${index}`}
                            value={row.monto ?? ''}
                            onChange={(val) => handleRowChange(index, 'monto', val)}
                          />
                        </Field>
                      </div>
                    </div>
                  )
                })}
                {totalMontos > 0 ? (
                  <p className="contracts-empty-hint">
                    Total ampliación:{' '}
                    <strong>${Number(totalMontos).toLocaleString('es-CL')}</strong>
                  </p>
                ) : null}
              </div>
            )}
          </div>

          <Field
            label="% de ampliación"
            htmlFor="amp-pct"
            tip="Informativo (ej. 30). No se usa para calcular montos."
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
            tip={
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
