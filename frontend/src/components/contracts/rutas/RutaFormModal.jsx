import React, { useEffect, useState } from 'react'
import {
  Modal,
  Button,
  Field,
  Input,
  Select,
  Textarea,
  Switch,
  Alert,
  Icon,
  CurrencyInput,
  useFormOverlay,
  formatApiFormError,
} from '@slep/ui'

const EMPTY_FORM = {
  nombre: '',
  proveedor: '',
  establecimientos: [],
  valor_diario: '',
  valor_mensual: '',
  itinerario: '',
  dia_inicio_periodo: 21,
  dia_fin_periodo: 20,
  incluir_fines_semana: false,
  excluir_feriados: true,
}

export default function RutaFormModal({
  open,
  onClose,
  mode = 'create',
  formData,
  setFormData,
  onSave,
  contrato,
  showEditWarning = false,
  variant = 'ruta',
  lineasExistentes = [],
}) {
  const [searchTermEst, setSearchTermEst] = useState('')
  const overlay = useFormOverlay()

  useEffect(() => {
    if (!open) return
    overlay.reset()
    setSearchTermEst('')
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset solo al abrir
  }, [open, mode])

  const availableEsts = (() => {
    const all =
      contrato?.proveedores_asociados.find(
        (pa) => pa.proveedor === parseInt(formData?.proveedor, 10),
      )?.establecimientos_detalle || []
    if (variant !== 'establecimiento' || !formData?.proveedor) return all
    const ocupados = new Set()
    lineasExistentes.forEach((linea) => {
      if (String(linea.proveedor) !== String(formData.proveedor)) return
      if (mode === 'edit' && linea.id === formData.id) return
      const ids = (linea.establecimientos || []).length
        ? linea.establecimientos
        : (linea.establecimientos_detalle || []).map((e) => e.id)
      ids.forEach((id) => ocupados.add(Number(id)))
    })
    return all.filter((est) => !ocupados.has(est.id))
  })()

  const filteredEsts = availableEsts.filter((est) =>
    est.nombre.toLowerCase().includes(searchTermEst.toLowerCase()),
  )

  const handleClose = () => {
    if (overlay.busy) return
    overlay.reset()
    setSearchTermEst('')
    onClose()
  }

  const handleOverlayDismiss = () => {
    if (overlay.status === 'success') {
      overlay.reset()
      setSearchTermEst('')
      onClose({ saved: true })
      return
    }
    overlay.dismiss()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await overlay.run(
        async () => {
          await onSave(formData)
        },
        {
          successDescription:
            variant === 'establecimiento'
              ? mode === 'edit'
                ? 'Establecimiento actualizado.'
                : (formData.establecimientos || []).length > 1
                  ? `${formData.establecimientos.length} establecimientos agregados.`
                  : 'Establecimiento agregado.'
              : mode === 'edit'
                ? 'Ruta actualizada.'
                : 'Ruta creada.',
          formatError: (err) => formatApiFormError(err),
        },
      )
    } catch {
      // El error se muestra en FormOverlay
    }
  }

  if (!formData) return null

  const esLinea = variant === 'establecimiento'
  const nEst = (formData.establecimientos || []).length
  const title = esLinea
    ? mode === 'edit'
      ? 'Editar establecimiento'
      : 'Agregar establecimientos'
    : mode === 'edit'
      ? 'Editar ruta operativa'
      : 'Nueva ruta operativa'
  const submitLabel = esLinea
    ? mode === 'edit'
      ? 'Actualizar'
      : nEst > 1
        ? `Agregar (${nEst})`
        : 'Agregar'
    : mode === 'edit'
      ? 'Actualizar ruta'
      : 'Guardar ruta'
  const formId = mode === 'edit' ? 'ruta-edit-form' : 'ruta-create-form'

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={title}
      size={esLinea && mode === 'edit' ? 'md' : 'lg'}
      className={esLinea ? undefined : 'rutas-detail-modal--wide'}
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
            form={formId}
            loading={overlay.busy}
            disabled={
              overlay.busy ||
              overlay.active ||
              (esLinea && mode === 'create' && nEst === 0)
            }
          >
            {submitLabel}
          </Button>
        </>
      }
    >
      <form id={formId} className="crud-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          {!esLinea ? (
            <Field label="Nombre" required htmlFor={`${formId}-nombre`}>
              <Input
                id={`${formId}-nombre`}
                required
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              />
            </Field>
          ) : null}
          <Field
            label="Proveedor"
            required
            htmlFor={`${formId}-proveedor`}
            className={esLinea ? 'field--full' : undefined}
          >
            <Select
              id={`${formId}-proveedor`}
              required
              value={formData.proveedor}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  proveedor: e.target.value,
                  establecimientos: [],
                  nombre: esLinea ? '' : formData.nombre,
                })
              }
            >
              <option value="">Seleccionar proveedor…</option>
              {contrato?.proveedores_asociados.map((pa) => (
                <option key={pa.proveedor} value={pa.proveedor}>
                  {pa.proveedor_nombre}
                </option>
              ))}
            </Select>
          </Field>

          {esLinea && mode === 'edit' ? (
            <Field
              label="Establecimiento"
              required
              htmlFor={`${formId}-est`}
              className="field--full"
            >
              <Select
                id={`${formId}-est`}
                required
                value={formData.establecimientos[0] || ''}
                onChange={(e) => {
                  const estId = e.target.value ? parseInt(e.target.value, 10) : null
                  const est = availableEsts.find((item) => item.id === estId)
                  setFormData({
                    ...formData,
                    establecimientos: estId ? [estId] : [],
                    nombre: est?.nombre || '',
                  })
                }}
              >
                <option value="">Seleccionar establecimiento…</option>
                {availableEsts.map((est) => (
                  <option key={est.id} value={est.id}>
                    {est.nombre}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <div className="field field--full">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 'var(--space-2)',
                }}
              >
                <label className="field__label">
                  Establecimientos ({formData.establecimientos.length} seleccionados)
                </label>
                <div className="rutas-detail-est-actions">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        establecimientos: availableEsts.map((e) => e.id),
                      })
                    }
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    className="is-muted"
                    onClick={() => setFormData({ ...formData, establecimientos: [] })}
                  >
                    Limpiar
                  </button>
                </div>
              </div>
              <div className="input-wrap" style={{ marginBottom: 'var(--space-2)' }}>
                <Icon name="search" className="input-wrap__icon" size="sm" />
                <Input
                  type="search"
                  placeholder="Buscar establecimiento…"
                  value={searchTermEst}
                  onChange={(e) => setSearchTermEst(e.target.value)}
                />
              </div>
              <div className="rutas-detail-est-grid">
                {filteredEsts.map((est) => (
                  <label key={est.id} className="rutas-detail-est-item">
                    <input
                      type="checkbox"
                      checked={formData.establecimientos.includes(est.id)}
                      onChange={(e) => {
                        const newEsts = e.target.checked
                          ? [...formData.establecimientos, est.id]
                          : formData.establecimientos.filter((id) => id !== est.id)
                        setFormData({ ...formData, establecimientos: newEsts })
                      }}
                    />
                    <span>{est.nombre}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {!esLinea ? (
            <Field
              label="Itinerario / trayecto (detalle para el acta)"
              htmlFor={`${formId}-itinerario`}
              className="field--full"
            >
              <Textarea
                id={`${formId}-itinerario`}
                rows={3}
                placeholder="Ej: Iquique - Los Verdes - Chipana. Describa los puntos clave de la ruta."
                value={formData.itinerario}
                onChange={(e) => setFormData({ ...formData, itinerario: e.target.value })}
              />
            </Field>
          ) : null}

          {esLinea ? (
            <Field
              label={mode === 'edit' ? 'Monto mensual' : 'Monto mensual (igual para los seleccionados)'}
              required
              htmlFor={`${formId}-valor-mensual`}
              className="field--full"
            >
              <CurrencyInput
                id={`${formId}-valor-mensual`}
                required
                value={formData.valor_mensual}
                onChange={(val) => setFormData({ ...formData, valor_mensual: val })}
              />
            </Field>
          ) : null}

          {esLinea ? (
            <>
              <div className="field">
                <Switch
                  label="Incluir fines de semana"
                  checked={!!formData.incluir_fines_semana}
                  onChange={(e) =>
                    setFormData({ ...formData, incluir_fines_semana: e.target.checked })
                  }
                />
              </div>
              <div className="field">
                <Switch
                  label="Incluir feriados"
                  checked={!formData.excluir_feriados}
                  onChange={(e) =>
                    setFormData({ ...formData, excluir_feriados: !e.target.checked })
                  }
                />
              </div>
            </>
          ) : (
            <>
              <Field label="Valor diario" required htmlFor={`${formId}-valor`}>
                <CurrencyInput
                  id={`${formId}-valor`}
                  required
                  value={formData.valor_diario}
                  onChange={(val) => setFormData({ ...formData, valor_diario: val })}
                />
              </Field>
              <Field label="Día inicio" required htmlFor={`${formId}-dia-inicio`}>
                <Input
                  id={`${formId}-dia-inicio`}
                  required
                  type="number"
                  value={formData.dia_inicio_periodo}
                  onChange={(e) =>
                    setFormData({ ...formData, dia_inicio_periodo: e.target.value })
                  }
                />
              </Field>
              <Field label="Día fin" required htmlFor={`${formId}-dia-fin`}>
                <Input
                  id={`${formId}-dia-fin`}
                  required
                  type="number"
                  value={formData.dia_fin_periodo}
                  onChange={(e) => setFormData({ ...formData, dia_fin_periodo: e.target.value })}
                />
              </Field>

              <div className="field">
                <Switch
                  label="Excluir fines de semana"
                  checked={!formData.incluir_fines_semana}
                  onChange={(e) =>
                    setFormData({ ...formData, incluir_fines_semana: !e.target.checked })
                  }
                />
              </div>
              <div className="field">
                <Switch
                  label="Excluir feriados"
                  checked={!!formData.excluir_feriados}
                  onChange={(e) =>
                    setFormData({ ...formData, excluir_feriados: e.target.checked })
                  }
                />
              </div>
            </>
          )}

          {showEditWarning ? (
            <div className="field field--full">
              <Alert variant="warning" title="Atención">
                Los cambios solo afectarán a los periodos que aún se encuentren ABIERTOS. Los
                periodos CERRADOS mantendrán sus fechas y montos originales.
              </Alert>
            </div>
          ) : null}
        </div>
      </form>
    </Modal>
  )
}

export { EMPTY_FORM }
