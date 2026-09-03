import React from 'react'
import SearchableSelect from '../common/SearchableSelect'
import MultiSearchableSelect from '../common/MultiSearchableSelect'
import {
  Button,
  Field,
  Input,
  Select,
  Icon,
  Switch,
  Alert,
} from '@slep/ui'

/** Fuera del render: si se define adentro, React remonta los inputs en cada tecla. */
function ContractFormPanel({ compactLayout, area, wide = false, children }) {
  if (!compactLayout) return children
  const areaClass = area ? ` contract-draft-form__panel--${area}` : ''
  return (
    <section
      className={`contract-draft-form__panel${wide ? ' contract-draft-form__panel--wide' : ''}${areaClass}`}
    >
      {children}
    </section>
  )
}

const ContractForm = ({
  formId = 'contract-form',
  formData,
  setFormData,
  lookups = {},
  isDraft = false,
  editingId,
  onSubmit,
  showDraftBanner = false,
  compactLayout = false,
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

  const publishRequired = !isDraft

  const patchForm = (patch) => {
    setFormData((prev) => ({ ...prev, ...patch }))
  }

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

  return (
    <form
      id={formId}
      className={`crud-form${compactLayout ? ' contract-draft-form' : ''}`}
      onSubmit={onSubmit}
    >
      {showDraftBanner ? (
        <Alert variant="info" title="Borrador" className="alert--compact">
          Los cambios se guardan automáticamente. Puede volver al listado cuando quiera; el
          borrador queda en la pestaña Borradores hasta publicarlo o eliminarlo.
        </Alert>
      ) : null}

      <ContractFormPanel compactLayout={compactLayout} area="info">
        <p className="contracts-section-title">1. Información general</p>
        <div className="form-grid">
          <Field
            label="Descripción"
            required={publishRequired}
            htmlFor="c-desc"
            className="field--full"
          >
            <Input
              id="c-desc"
              required={publishRequired}
              placeholder="Ej: KJC ADQ SERVICIO INTERNET Y TELEFONIA PARA 11 JARDINES…"
              value={formData.descripcion || ''}
              onChange={(e) => patchForm({ descripcion: e.target.value })}
            />
          </Field>
          <Field
            label="Detalle"
            htmlFor="c-detalle"
            className="field--full"
            hint="Texto corto opcional para documentos (recepción, actas). Si lo dejas vacío, no se usa en plantillas."
          >
            <Input
              id="c-detalle"
              placeholder="Ej: Servicio de internet jardín infantil"
              value={formData.detalle || ''}
              onChange={(e) => patchForm({ detalle: e.target.value })}
            />
          </Field>
          <Field
            label="Código Mercado Público"
            required={publishRequired}
            htmlFor="c-cod"
            hint={isDraft ? 'Obligatorio al publicar. Debe ser único en el sistema.' : undefined}
          >
            <Input
              id="c-cod"
              required={publishRequired}
              placeholder="Ej: 1234-56-LP24"
              value={formData.codigo_mercado_publico || ''}
              onChange={(e) => patchForm({ codigo_mercado_publico: e.target.value })}
            />
          </Field>
          <Field label="Nº CDP" htmlFor="c-cdp">
            <Input
              id="c-cdp"
              value={formData.cdp || ''}
              onChange={(e) => patchForm({ cdp: e.target.value })}
            />
          </Field>
          <Field
            label="Plantilla de cobro"
            required={publishRequired && !editingId}
            htmlFor="c-plantilla"
            className={compactLayout ? undefined : 'field--full'}
          >
            <Select
              id="c-plantilla"
              required={publishRequired && !editingId}
              value={formData.plantilla_cobro || ''}
              onChange={(e) => patchForm({ plantilla_cobro: e.target.value })}
            >
              <option value="">
                {editingId || isDraft ? 'Sin definir' : 'Seleccione…'}
              </option>
              <option value="TRANSPORTE">Transporte · valor diario</option>
              <option value="OTRO">Otro · monto mensual</option>
              <option value="VOLUMETRICO">Volumétrico · $/m³</option>
            </Select>
          </Field>
          <div className="field field--full">
            <Switch
              id="c-aplica-iva"
              checked={formData.aplica_iva !== false}
              onChange={(e) => patchForm({ aplica_iva: e.target.checked })}
              label="Aplica IVA (19%)"
            />
            <p className="field__hint">
              Si aplica, en la recepción de Mercado Público el monto total de gestión se desglosa en
              neto + IVA 19%.
            </p>
          </div>
        </div>
      </ContractFormPanel>

      <ContractFormPanel compactLayout={compactLayout} area="class">
        <p className="contracts-section-title">2. Clasificación y plazos</p>
        <div className="form-grid">
          <Field label="Categoría" htmlFor="c-cat" required={publishRequired}>
            <Select
              id="c-cat"
              required={publishRequired}
              value={formData.categoria || ''}
              onChange={(e) => patchForm({ categoria: e.target.value })}
            >
              <option value="">Seleccione…</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Proceso" htmlFor="c-proc" required={publishRequired}>
            <Select
              id="c-proc"
              required={publishRequired}
              value={formData.proceso || ''}
              onChange={(e) => patchForm({ proceso: e.target.value })}
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
              onChange={(e) => patchForm({ orientacion: e.target.value })}
            >
              <option value="">No definida</option>
              {orientaciones.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nombre}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Estado" htmlFor="c-est" required={publishRequired}>
            <Select
              id="c-est"
              required={publishRequired}
              value={formData.estado || ''}
              onChange={(e) => patchForm({ estado: e.target.value })}
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
          <Field label="Fecha adjudicación" required={publishRequired} htmlFor="c-fa">
            <Input
              id="c-fa"
              type="date"
              required={publishRequired}
              value={formData.fecha_adjudicacion || ''}
              onChange={(e) => patchForm({ fecha_adjudicacion: e.target.value })}
            />
          </Field>
          <Field label="Fecha inicio" required={publishRequired} htmlFor="c-fi">
            <Input
              id="c-fi"
              type="date"
              required={publishRequired}
              value={formData.fecha_inicio || ''}
              onChange={(e) => patchForm({ fecha_inicio: e.target.value })}
            />
          </Field>
          <Field label="Fecha término" required={publishRequired} htmlFor="c-ft">
            <Input
              id="c-ft"
              type="date"
              required={publishRequired}
              value={formData.fecha_termino || ''}
              onChange={(e) => patchForm({ fecha_termino: e.target.value })}
            />
          </Field>
        </div>
      </ContractFormPanel>

      <ContractFormPanel compactLayout={compactLayout} area="providers" wide>
        <div className="contracts-section-head">
          <p className="contracts-section-title">3. Proveedores adjudicados</p>
          <Button type="button" variant="secondary" size="sm" onClick={handleAddProvider}>
            <Icon name="plus" size="sm" /> Añadir
          </Button>
        </div>

        {(formData.proveedores_asociados || []).length === 0 ? (
          <p className="contracts-empty-hint">
            No hay proveedores asignados. Use «Añadir» para incorporar uno.
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
      </ContractFormPanel>

      <ContractFormPanel compactLayout={compactLayout} area="oc">
        <p className="contracts-section-title">4. Orden de compra</p>
        <div className="form-grid">
          <div className={`field${compactLayout ? '' : ' field--full'}`}>
            <span className="field__label">Tipo de OC</span>
            <div className="contracts-radios">
              <label className="contracts-radio">
                <input
                  type="radio"
                  name="tipo_oc"
                  checked={formData.tipo_oc === 'UNICA'}
                  onChange={() => patchForm({ tipo_oc: 'UNICA' })}
                />
                OC única
              </label>
              <label className="contracts-radio">
                <input
                  type="radio"
                  name="tipo_oc"
                  checked={formData.tipo_oc === 'MULTIPLE'}
                  onChange={() => patchForm({ tipo_oc: 'MULTIPLE' })}
                />
                Múltiples OC (por RC)
              </label>
            </div>
          </div>
          {formData.tipo_oc === 'UNICA' ? (
            <Field label="Nº Orden de compra" htmlFor="c-oc">
              <Input
                id="c-oc"
                value={formData.nro_oc || ''}
                onChange={(e) => patchForm({ nro_oc: e.target.value })}
              />
            </Field>
          ) : null}
        </div>
      </ContractFormPanel>
    </form>
  )
}

export default ContractForm
