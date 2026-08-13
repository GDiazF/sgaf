import React, { useState, useEffect } from 'react'
import SearchableSelect from '../common/SearchableSelect'
import MultiSearchableSelect from '../common/MultiSearchableSelect'
import {
  Modal,
  Button,
  Field,
  Input,
  Select,
  Textarea,
  Alert,
  CurrencyInput,
  useFormOverlay,
  formatApiFormError,
} from '@slep/ui'

const AdquisicionModal = ({
  open,
  onClose,
  onSave,
  editingId,
  initialData,
  lookups = {},
  variant = 'sin_oc',
}) => {
  const {
    establishments = [],
    providers = [],
    deliveryTypes = [],
    establishmentTypes = [],
    groups = [],
  } = lookups

  const [formData, setFormData] = useState(initialData || {})
  const overlay = useFormOverlay()

  useEffect(() => {
    if (!open) return
    overlay.reset()
    setFormData({
      ...initialData,
      periodo: initialData?.periodo ? String(initialData.periodo).substring(0, 7) : '',
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset solo al abrir
  }, [open, initialData])

  const handleBulkSelect = (type) => {
    let selectedIds = []
    if (type === 'ALL') {
      selectedIds = establishments.map((e) => e.id)
    } else if (type === 'CLEAR') {
      selectedIds = []
    } else {
      const typesInArea = (establishmentTypes || [])
        .filter((t) => t.area_gestion === type)
        .map((t) => t.id)
      selectedIds = establishments
        .filter((e) => typesInArea.includes(e.tipo))
        .map((e) => e.id)
    }
    setFormData((prev) => ({ ...prev, establecimientos: selectedIds }))
  }

  const getSmartGlosa = () => {
    if (!formData.establecimientos?.length) return ''
    const count = formData.establecimientos.length
    if (count === establishments.length && count > 5) {
      return '\n- TOTALIDAD DE ESTABLECIMIENTOS'
    }

    const selectedSet = new Set(formData.establecimientos)
    const areaTotals = {}
    const areaCounts = {}
    ;(establishmentTypes || []).forEach((t) => {
      const area = t.area_gestion || 'ESTABLECIMIENTO'
      areaTotals[area] =
        (areaTotals[area] || 0) + establishments.filter((e) => e.tipo === t.id).length
      areaCounts[area] =
        (areaCounts[area] || 0) +
        establishments.filter((e) => e.tipo === t.id && selectedSet.has(e.id)).length
    })

    if (count > 5) {
      if (
        areaCounts.ESTABLECIMIENTO === areaTotals.ESTABLECIMIENTO &&
        count === areaCounts.ESTABLECIMIENTO
      ) {
        return '\n- TOTALIDAD DE ESTABLECIMIENTOS (ESCUELAS/LICEOS)'
      }
      if (areaCounts.JARDIN === areaTotals.JARDIN && count === areaCounts.JARDIN) {
        return '\n- TOTALIDAD DE JARDINES INFANTILES VTF'
      }
      if (areaCounts.OFICINA === areaTotals.OFICINA && count === areaCounts.OFICINA) {
        return '\n- OFICINA CENTRAL ADM.'
      }
    }

    const names = formData.establecimientos
      .map((id) => establishments.find((e) => e.id === id)?.nombre)
      .filter(Boolean)
    return names.length > 0 ? `\n- ${names.join('\n- ')}` : ''
  }

  const periodoLabel = (() => {
    if (!formData.periodo) return ''
    const [year, month] = formData.periodo.split('-')
    const date = new Date(year, month - 1, 1)
    return ` - ${date.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' }).toUpperCase()}`
  })()

  const selectedGroup = groups.find(
    (g) => g.id.toString() === formData.grupo_firmante?.toString(),
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    const finalData = { ...formData }
    if (finalData.periodo && finalData.periodo.length === 7) {
      finalData.periodo = `${finalData.periodo}-01`
    } else if (!finalData.periodo) {
      finalData.periodo = null
    }
    if (!finalData.establecimientos) finalData.establecimientos = []

    const isCompraAgil = variant === 'compra_agil'
    try {
      await overlay.run(
        async () => {
          await onSave(finalData)
        },
        {
          successDescription: editingId
            ? isCompraAgil
              ? 'Compra ágil actualizada.'
              : 'Factura actualizada.'
            : isCompraAgil
              ? 'Compra ágil registrada.'
              : 'Factura registrada.',
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

  const isCompraAgil = variant === 'compra_agil'

  return (
    <Modal
      open={open}
      onClose={handleClose}
      size="lg"
      title={
        editingId
          ? isCompraAgil
            ? 'Editar compra ágil'
            : 'Editar factura sin OC'
          : isCompraAgil
            ? 'Registrar compra ágil'
            : 'Registrar factura sin OC'
      }
      subheader={
        isCompraAgil
          ? 'Recepción con orden de compra (folio RCA)'
          : 'Compra sin orden de compra asociada (folio RCF)'
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
            form="adq-form"
            loading={overlay.busy}
            disabled={overlay.busy || overlay.active}
          >
            {editingId ? 'Actualizar' : 'Guardar'}
          </Button>
        </>
      }
    >
      <form id="adq-form" className="crud-form" onSubmit={handleSubmit}>
        <p className="contracts-section-title">1. Identificación</p>
        <div className="form-grid">
          <Field label="Folio RC" htmlFor="adq-folio">
            <Input id="adq-folio" value={formData.folio || ''} readOnly placeholder="Automático…" />
          </Field>
          <Field label="Nº CDP" htmlFor="adq-cdp">
            <Input
              id="adq-cdp"
              value={formData.cdp || ''}
              onChange={(e) => setFormData({ ...formData, cdp: e.target.value })}
              placeholder="Opcional…"
            />
          </Field>
          <Field label="Nº Factura" htmlFor="adq-fac">
            <Input
              id="adq-fac"
              value={formData.nro_factura || ''}
              onChange={(e) => setFormData({ ...formData, nro_factura: e.target.value })}
            />
          </Field>
          <Field label="Nº Orden de compra" required={isCompraAgil} htmlFor="adq-oc">
            <Input
              id="adq-oc"
              required={isCompraAgil}
              value={formData.nro_oc || ''}
              onChange={(e) => setFormData({ ...formData, nro_oc: e.target.value })}
              placeholder={isCompraAgil ? 'Obligatorio…' : 'Opcional…'}
            />
          </Field>
        </div>

        <p className="contracts-section-title">2. Proveedor y destino</p>
        <div className="form-grid">
          <div className="field field--full">
            <SearchableSelect
              label="Proveedor / Emisor"
              required
              options={providers.map((p) => ({
                value: p.id,
                label: `${p.nombre}${p.rut ? ` (RUT: ${p.rut})` : ''}`,
              }))}
              value={formData.proveedor}
              onChange={(val) => setFormData({ ...formData, proveedor: val })}
              placeholder="Seleccione proveedor…"
            />
          </div>
          <div className="field field--full">
            <MultiSearchableSelect
              label="Establecimientos de destino"
              options={establishments.map((e) => ({ value: e.id, label: e.nombre }))}
              value={formData.establecimientos || []}
              onChange={(val) => setFormData({ ...formData, establecimientos: val })}
              placeholder="Seleccione uno o muchos…"
            />
          </div>
        </div>
        <div className="contracts-bulk">
          <Button type="button" variant="outline" size="sm" onClick={() => handleBulkSelect('ALL')}>
            Todos
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleBulkSelect('ESTABLECIMIENTO')}
          >
            Establecimientos
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleBulkSelect('JARDIN')}
          >
            Jardines VTF
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleBulkSelect('OFICINA')}
          >
            Oficina Central
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => handleBulkSelect('CLEAR')}>
            Limpiar
          </Button>
        </div>

        <p className="contracts-section-title">3. Cronología</p>
        <div className="form-grid form-grid--3">
          <Field label="Fecha recepción" required htmlFor="adq-fr">
            <Input
              id="adq-fr"
              type="date"
              required
              value={formData.fecha_recepcion || ''}
              onChange={(e) =>
                setFormData({ ...formData, fecha_recepcion: e.target.value })
              }
            />
          </Field>
          <Field label="Periodo de cobro" htmlFor="adq-periodo">
            <Input
              id="adq-periodo"
              type="month"
              value={formData.periodo || ''}
              onChange={(e) => setFormData({ ...formData, periodo: e.target.value })}
            />
          </Field>
          <Field label="Tipo de entrega" required htmlFor="adq-te">
            <Select
              id="adq-te"
              required
              value={formData.tipo_entrega || ''}
              onChange={(e) => setFormData({ ...formData, tipo_entrega: e.target.value })}
            >
              <option value="">Seleccione…</option>
              {deliveryTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <p className="contracts-section-title">4. Finanzas</p>
        <div className="form-grid">
          <Field label="Concepto / glosa" required htmlFor="adq-desc" className="field--full">
            <Textarea
              id="adq-desc"
              required
              rows={2}
              value={formData.descripcion || ''}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              placeholder="Ej: Servicios de transporte, compra de equipos…"
            />
          </Field>
          <div className="field field--full">
            <Alert variant="info" title="Vista previa glosa (PDF)">
              <pre className="contracts-glosa-preview">
                {(formData.descripcion || '') + periodoLabel + getSmartGlosa()}
              </pre>
            </Alert>
          </div>
        </div>
        <div className="form-grid form-grid--3">
          <Field label="Monto neto" required htmlFor="adq-neto">
            <CurrencyInput
              id="adq-neto"
              required
              value={formData.total_neto ?? ''}
              onChange={(val) => setFormData({ ...formData, total_neto: val })}
            />
          </Field>
          <Field label="IVA" required htmlFor="adq-iva">
            <CurrencyInput
              id="adq-iva"
              required
              placeholder="0"
              value={formData.iva ?? ''}
              onChange={(val) => setFormData({ ...formData, iva: val })}
            />
          </Field>
          <Field label="Total a pagar" required htmlFor="adq-total">
            <CurrencyInput
              id="adq-total"
              required
              placeholder="0"
              value={formData.total_pagar ?? ''}
              onChange={(val) => setFormData({ ...formData, total_pagar: val })}
            />
          </Field>
        </div>

        <p className="contracts-section-title">5. Firmante</p>
        <div className="form-grid">
          <Field label="Grupo de firmantes" htmlFor="adq-grp">
            <Select
              id="adq-grp"
              value={formData.grupo_firmante || ''}
              onChange={(e) => {
                const gid = e.target.value
                const grp = groups.find((g) => g.id.toString() === gid)
                setFormData((prev) => ({
                  ...prev,
                  grupo_firmante: gid,
                  firmante: grp ? grp.jefe || '' : '',
                }))
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
          <Field label="Funcionario firmante" htmlFor="adq-firm">
            <Select
              id="adq-firm"
              value={formData.firmante || ''}
              disabled={!formData.grupo_firmante}
              onChange={(e) => setFormData({ ...formData, firmante: e.target.value })}
            >
              <option value="">Seleccione funcionario…</option>
              {(selectedGroup?.miembros_detalle || []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                  {m.id === selectedGroup?.jefe ? ' (Jefe)' : ''}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Alert variant="info">
          Ingrese el monto neto e IVA. El total se usa en el documento de recepción conforme.
        </Alert>
      </form>
    </Modal>
  )
}

export default AdquisicionModal
