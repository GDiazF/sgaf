import React, { useState, useEffect } from 'react'
import SearchableSelect from '../common/SearchableSelect'
import MultiSearchableSelect from '../common/MultiSearchableSelect'
import {
  Modal,
  Button,
  Field,
  Input,
  Select,
  Icon,
  useFormOverlay,
  formatApiFormError,
} from '@slep/ui'

const ContractModal = ({
  open,
  onClose,
  onSave,
  editingId,
  initialData,
  lookups = {},
}) => {
  const {
    procesos = [],
    estados = [],
    categorias = [],
    orientaciones = [],
    proveedores = [],
    establecimientos = [],
    tiposEstablecimiento = [],
  } = lookups

  const [formData, setFormData] = useState({})
  const overlay = useFormOverlay()

  useEffect(() => {
    if (!open) return
    overlay.reset()
    if (initialData) setFormData(initialData)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset solo al abrir
  }, [open, initialData])

  const handleAddProvider = () => {
    setFormData((prev) => ({
      ...prev,
      proveedores_asociados: [
        ...(prev.proveedores_asociados || []),
        {
          proveedor: '',
          monto_adjudicado: '',
          monto_consumido_previo: '',
          establecimientos: [],
        },
      ],
    }))
  }

  const handleRemoveProvider = (index) => {
    setFormData((prev) => ({
      ...prev,
      proveedores_asociados: (prev.proveedores_asociados || []).filter((_, i) => i !== index),
    }))
  }

  const handleProviderChange = (index, field, value) => {
    setFormData((prev) => {
      const next = [...(prev.proveedores_asociados || [])]
      next[index] = { ...next[index], [field]: value }
      return { ...prev, proveedores_asociados: next }
    })
  }

  const handleBulkSelect = (index, type) => {
    let selectedIds = []
    if (type === 'ALL') {
      selectedIds = establecimientos.map((e) => e.id)
    } else if (type === 'CLEAR') {
      selectedIds = []
    } else {
      const typesInArea = (tiposEstablecimiento || [])
        .filter((t) => t.area_gestion === type)
        .map((t) => t.id)
      selectedIds = establecimientos
        .filter((e) => typesInArea.includes(e.tipo))
        .map((e) => e.id)
    }
    handleProviderChange(index, 'establecimientos', selectedIds)
  }

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
      <form id="contract-form" className="crud-form" onSubmit={handleSubmit}>
        <p className="contracts-section-title">1. Información general</p>
        <div className="form-grid">
          <Field label="Descripción" required htmlFor="c-desc" className="field--full">
            <Input
              id="c-desc"
              required
              placeholder="Ej: Adquisición de materiales…"
              value={formData.descripcion || ''}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
            />
          </Field>
          <Field label="Código Mercado Público" required htmlFor="c-cod">
            <Input
              id="c-cod"
              required
              placeholder="Ej: 1234-56-LP24"
              value={formData.codigo_mercado_publico || ''}
              onChange={(e) =>
                setFormData({ ...formData, codigo_mercado_publico: e.target.value })
              }
            />
          </Field>
          <Field label="Nº CDP" htmlFor="c-cdp">
            <Input
              id="c-cdp"
              value={formData.cdp || ''}
              onChange={(e) => setFormData({ ...formData, cdp: e.target.value })}
            />
          </Field>
          <Field
            label="Plantilla de cobro"
            required={!editingId}
            htmlFor="c-plantilla"
            className="field--full"
          >
            <Select
              id="c-plantilla"
              required={!editingId}
              value={formData.plantilla_cobro || ''}
              onChange={(e) => setFormData({ ...formData, plantilla_cobro: e.target.value })}
            >
              <option value="">{editingId ? 'Sin definir (contratos anteriores)' : 'Seleccione…'}</option>
              <option value="TRANSPORTE">Transporte · valor diario</option>
              <option value="OTRO">Otro · monto mensual</option>
            </Select>
          </Field>
        </div>

        <p className="contracts-section-title">2. Clasificación y plazos</p>
        <div className="form-grid">
          <Field label="Categoría" htmlFor="c-cat">
            <Select
              id="c-cat"
              value={formData.categoria || ''}
              onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
            >
              <option value="">Seleccione…</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Proceso" htmlFor="c-proc">
            <Select
              id="c-proc"
              value={formData.proceso || ''}
              onChange={(e) => setFormData({ ...formData, proceso: e.target.value })}
            >
              <option value="">Seleccione…</option>
              {procesos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Orientación" htmlFor="c-ori">
            <Select
              id="c-ori"
              value={formData.orientacion || ''}
              onChange={(e) => setFormData({ ...formData, orientacion: e.target.value })}
            >
              <option value="">No definida</option>
              {orientaciones.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nombre}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Estado" htmlFor="c-est">
            <Select
              id="c-est"
              value={formData.estado || ''}
              onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
            >
              <option value="">Seleccione…</option>
              {estados.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="form-grid form-grid--3">
          <Field label="Fecha adjudicación" required htmlFor="c-fa">
            <Input
              id="c-fa"
              type="date"
              required
              value={formData.fecha_adjudicacion || ''}
              onChange={(e) =>
                setFormData({ ...formData, fecha_adjudicacion: e.target.value })
              }
            />
          </Field>
          <Field label="Fecha inicio" required htmlFor="c-fi">
            <Input
              id="c-fi"
              type="date"
              required
              value={formData.fecha_inicio || ''}
              onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
            />
          </Field>
          <Field label="Fecha término" required htmlFor="c-ft">
            <Input
              id="c-ft"
              type="date"
              required
              value={formData.fecha_termino || ''}
              onChange={(e) => setFormData({ ...formData, fecha_termino: e.target.value })}
            />
          </Field>
        </div>

        <div className="contracts-section-head">
          <p className="contracts-section-title">3. Proveedores adjudicados</p>
          <Button type="button" variant="secondary" size="sm" onClick={handleAddProvider}>
            <Icon name="plus" size="sm" /> Añadir
          </Button>
        </div>

        {(formData.proveedores_asociados || []).length === 0 ? (
          <p className="contracts-empty-hint">
            No hay proveedores asignados. Usá «Añadir» para incorporar uno.
          </p>
        ) : (
          <div className="contracts-providers-list">
            {(formData.proveedores_asociados || []).map((prov, index) => (
              <div key={index} className="contracts-provider-card">
                <div className="contracts-provider-card__head">
                  <span>Proveedor {index + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveProvider(index)}
                    aria-label="Quitar proveedor"
                  >
                    <Icon name="trash" size="sm" />
                  </Button>
                </div>
                <div className="form-grid">
                  <SearchableSelect
                    className="field--full"
                    label="Proveedor"
                    options={proveedores.map((p) => ({ value: p.id, label: p.nombre }))}
                    value={prov.proveedor}
                    onChange={(val) => handleProviderChange(index, 'proveedor', val)}
                    placeholder="Seleccione…"
                  />
                  <Field label="Monto adjudicado ($)" htmlFor={`c-ma-${index}`}>
                    <Input
                      id={`c-ma-${index}`}
                      type="number"
                      value={prov.monto_adjudicado ?? ''}
                      onChange={(e) =>
                        handleProviderChange(
                          index,
                          'monto_adjudicado',
                          e.target.value === '' ? '' : parseInt(e.target.value, 10),
                        )
                      }
                    />
                  </Field>
                  <Field label="Consumo previo ($)" htmlFor={`c-mp-${index}`}>
                    <Input
                      id={`c-mp-${index}`}
                      type="number"
                      value={prov.monto_consumido_previo ?? ''}
                      onChange={(e) =>
                        handleProviderChange(
                          index,
                          'monto_consumido_previo',
                          e.target.value === '' ? '' : parseInt(e.target.value, 10),
                        )
                      }
                    />
                  </Field>
                  <MultiSearchableSelect
                    className="field--full"
                    label="Establecimientos asignados"
                    options={establecimientos.map((e) => ({
                      value: e.id,
                      label: e.nombre,
                    }))}
                    value={prov.establecimientos || []}
                    onChange={(val) => handleProviderChange(index, 'establecimientos', val)}
                    placeholder="Seleccione establecimientos…"
                  />
                </div>
                <div className="contracts-bulk">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkSelect(index, 'ALL')}
                  >
                    Todos
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkSelect(index, 'ESTABLECIMIENTO')}
                  >
                    Escuelas/Liceos
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkSelect(index, 'JARDIN')}
                  >
                    Jardines VTF
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkSelect(index, 'OFICINA')}
                  >
                    Oficina Central
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleBulkSelect(index, 'CLEAR')}
                  >
                    Limpiar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="contracts-section-title">4. Orden de compra</p>
        <div className="form-grid">
          <div className="field field--full">
            <span className="field__label">Tipo de OC</span>
            <div className="contracts-radios">
              <label className="contracts-radio">
                <input
                  type="radio"
                  name="tipo_oc"
                  checked={formData.tipo_oc === 'UNICA'}
                  onChange={() => setFormData({ ...formData, tipo_oc: 'UNICA' })}
                />
                OC única
              </label>
              <label className="contracts-radio">
                <input
                  type="radio"
                  name="tipo_oc"
                  checked={formData.tipo_oc === 'MULTIPLE'}
                  onChange={() => setFormData({ ...formData, tipo_oc: 'MULTIPLE' })}
                />
                Múltiples OC (por RC)
              </label>
            </div>
          </div>
          {formData.tipo_oc === 'UNICA' ? (
            <Field label="Nº Orden de compra" htmlFor="c-oc" className="field--full">
              <Input
                id="c-oc"
                value={formData.nro_oc || ''}
                onChange={(e) => setFormData({ ...formData, nro_oc: e.target.value })}
              />
            </Field>
          ) : null}
        </div>
      </form>
    </Modal>
  )
}

export default ContractModal
