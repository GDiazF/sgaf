import React, { useState, useEffect } from 'react'
import MultiSearchableSelect from '../common/MultiSearchableSelect'
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

const ContractReceptionModal = ({
  open,
  onClose,
  onSave,
  contract,
  lookups = {},
  editingRC = null,
}) => {
  const {
    establishments = [],
    deliveryTypes = [],
    establishmentTypes = [],
    groups = [],
  } = lookups

  const buildInitial = () => ({
    cdp: contract?.cdp || '',
    nro_factura: '',
    nro_oc: contract?.tipo_oc === 'UNICA' ? contract?.nro_oc || '' : '',
    fecha_recepcion: new Date().toISOString().split('T')[0],
    descripcion: contract?.descripcion || '',
    periodo: '',
    proveedor:
      contract?.proveedores_asociados?.length === 1
        ? contract.proveedores_asociados[0].proveedor
        : '',
    establecimientos: contract?.establecimientos || [],
    tipo_entrega: '',
    total_neto: '',
    iva: '',
    total_pagar: '',
    grupo_firmante: '',
    firmante: '',
    folio: '',
  })

  const [formData, setFormData] = useState(buildInitial)
  const [isSplit, setIsSplit] = useState(false)
  const overlay = useFormOverlay()

  useEffect(() => {
    if (!open || !contract) return
    overlay.reset()
    if (editingRC) {
      setIsSplit(false)
      setFormData({
        ...editingRC,
        periodo: editingRC.periodo ? editingRC.periodo.substring(0, 7) : '',
        tipo_entrega: editingRC.tipo_entrega?.id || editingRC.tipo_entrega,
        grupo_firmante: editingRC.grupo_firmante?.id || editingRC.grupo_firmante,
        firmante: editingRC.firmante?.id || editingRC.firmante,
        establecimientos: editingRC.establecimientos?.map((e) => e.id || e) || [],
        folio: editingRC.folio || '',
      })
    } else {
      setIsSplit(false)
      setFormData(buildInitial())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset solo al abrir
  }, [open, contract, editingRC])

  const allowedEstablishmentIds = formData.proveedor
    ? contract?.proveedores_asociados?.find(
        (p) => p.proveedor.toString() === formData.proveedor.toString(),
      )?.establecimientos || []
    : []

  const filteredEstablishments =
    formData.proveedor && allowedEstablishmentIds.length > 0
      ? establishments.filter((e) => allowedEstablishmentIds.includes(e.id))
      : establishments

  const handleBulkSelect = (type) => {
    let selectedIds = []
    if (type === 'ALL') {
      selectedIds = filteredEstablishments.map((e) => e.id)
    } else if (type === 'CLEAR') {
      selectedIds = []
    } else {
      const typesInArea = establishmentTypes
        .filter((t) => t.area_gestion === type)
        .map((t) => t.id)
      selectedIds = filteredEstablishments
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
    establishmentTypes.forEach((t) => {
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
      .map((estId) => establishments.find((e) => e.id === estId)?.nombre)
      .filter(Boolean)
    return names.length > 0 ? `\n- ${names.join('\n- ')}` : ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await overlay.run(
        async () => {
          const finalData = { ...formData }
          if (finalData.periodo && finalData.periodo.length === 7) {
            finalData.periodo = `${finalData.periodo}-01`
          } else if (!finalData.periodo) {
            finalData.periodo = null
          }
          if (!finalData.establecimientos) finalData.establecimientos = []
          await onSave(finalData, isSplit)
        },
        {
          successDescription: editingRC
            ? 'Recepción actualizada.'
            : 'Recepción registrada.',
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

  const selectedGroup = groups.find(
    (g) => g.id.toString() === formData.grupo_firmante?.toString(),
  )

  const periodoLabel = (() => {
    if (!formData.periodo) return ''
    const [year, month] = formData.periodo.split('-')
    const date = new Date(year, month - 1, 1)
    return ` - ${date.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' }).toUpperCase()}`
  })()

  return (
    <Modal
      open={open}
      onClose={handleClose}
      size="lg"
      title={editingRC ? 'Editar recepción' : 'Registrar recepción'}
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
            form="rc-form"
            loading={overlay.busy}
            disabled={overlay.busy || overlay.active}
          >
            {editingRC ? 'Actualizar' : 'Guardar'}
          </Button>
        </>
      }
    >
      <form id="rc-form" className="crud-form" onSubmit={handleSubmit}>
        <p className="contracts-section-title">1. Facturación</p>
        <div className="form-grid">
          <Field label="Folio RC" htmlFor="rc-folio">
            <Input
              id="rc-folio"
              value={formData.folio || ''}
              onChange={(e) => setFormData({ ...formData, folio: e.target.value })}
            />
          </Field>
          <Field label="Nº CDP" required htmlFor="rc-cdp">
            <Input
              id="rc-cdp"
              required
              value={formData.cdp || ''}
              onChange={(e) => setFormData({ ...formData, cdp: e.target.value })}
            />
          </Field>
          <Field label="Nº Factura" htmlFor="rc-fac">
            <Input
              id="rc-fac"
              value={formData.nro_factura || ''}
              onChange={(e) => setFormData({ ...formData, nro_factura: e.target.value })}
            />
          </Field>
          <Field label="Nº Orden de compra" htmlFor="rc-oc">
            <Input
              id="rc-oc"
              value={formData.nro_oc || ''}
              readOnly={contract?.tipo_oc === 'UNICA' && !!contract?.nro_oc}
              onChange={(e) => setFormData({ ...formData, nro_oc: e.target.value })}
            />
          </Field>
        </div>

        <p className="contracts-section-title">2. Proveedor y destino</p>
        <div className="form-grid">
          <Field label="Proveedor" required htmlFor="rc-prov" className="field--full">
            <Select
              id="rc-prov"
              required
              value={formData.proveedor || ''}
              onChange={(e) => setFormData({ ...formData, proveedor: e.target.value })}
            >
              <option value="">Seleccione…</option>
              {(contract?.proveedores_asociados || []).map((p) => (
                <option key={p.proveedor} value={p.proveedor}>
                  {p.proveedor_nombre}
                </option>
              ))}
            </Select>
          </Field>
          <div className="field field--full">
            <MultiSearchableSelect
              label="Establecimientos de destino"
              options={filteredEstablishments.map((e) => ({
                value: e.id,
                label: e.nombre,
              }))}
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
        {!editingRC && formData.establecimientos?.length > 1 ? (
          <div className="field field--full" style={{ marginTop: '0.75rem' }}>
            <Switch
              id="rc-split"
              label={`Generar recepciones individuales (${formData.establecimientos.length} RCs)`}
              checked={isSplit}
              onChange={(e) => setIsSplit(e.target.checked)}
            />
          </div>
        ) : null}

        <p className="contracts-section-title">3. Cronología</p>
        <div className="form-grid form-grid--3">
          <Field label="Fecha recepción" required htmlFor="rc-fr">
            <Input
              id="rc-fr"
              type="date"
              required
              value={formData.fecha_recepcion || ''}
              onChange={(e) =>
                setFormData({ ...formData, fecha_recepcion: e.target.value })
              }
            />
          </Field>
          <Field label="Periodo de cobro" htmlFor="rc-periodo">
            <Input
              id="rc-periodo"
              type="month"
              value={formData.periodo || ''}
              onChange={(e) => setFormData({ ...formData, periodo: e.target.value })}
            />
          </Field>
          <Field label="Tipo de entrega" required htmlFor="rc-te">
            <Select
              id="rc-te"
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
          <Field label="Concepto / glosa" required htmlFor="rc-desc" className="field--full">
            <Textarea
              id="rc-desc"
              required
              rows={3}
              value={formData.descripcion || ''}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
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
          <Field label="Monto neto" required htmlFor="rc-neto">
            <CurrencyInput
              id="rc-neto"
              required
              value={formData.total_neto ?? ''}
              onChange={(val) => setFormData({ ...formData, total_neto: val })}
            />
          </Field>
          <Field label="IVA" required htmlFor="rc-iva">
            <CurrencyInput
              id="rc-iva"
              required
              value={formData.iva ?? ''}
              onChange={(val) => setFormData({ ...formData, iva: val })}
            />
          </Field>
          <Field label="Total a pagar" required htmlFor="rc-total">
            <CurrencyInput
              id="rc-total"
              required
              value={formData.total_pagar ?? ''}
              onChange={(val) => setFormData({ ...formData, total_pagar: val })}
            />
          </Field>
        </div>

        <p className="contracts-section-title">5. Firmante</p>
        <div className="form-grid">
          <Field label="Grupo de firmantes" htmlFor="rc-grp">
            <Select
              id="rc-grp"
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
              <option value="">Seleccione…</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nombre}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Funcionario firmante" htmlFor="rc-firm">
            <Select
              id="rc-firm"
              value={formData.firmante || ''}
              disabled={!formData.grupo_firmante}
              onChange={(e) => setFormData({ ...formData, firmante: e.target.value })}
            >
              <option value="">Seleccione…</option>
              {(selectedGroup?.miembros_detalle || []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                  {m.id === selectedGroup?.jefe ? ' (Jefe)' : ''}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <p className="contracts-empty-hint" style={{ marginTop: '1rem' }}>
          <Icon name="info" size="sm" /> Esta recepción quedará vinculada permanentemente
          al contrato.
        </p>
      </form>
    </Modal>
  )
}

export default ContractReceptionModal
