import React, { useState, useEffect } from 'react'
import MultiSearchableSelect from '../common/MultiSearchableSelect'
import api from '../../api'
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

const calcMontos = (neto, aplicaIva) => {
  const n = Math.round(Number(neto) || 0)
  const iva = aplicaIva ? Math.round(n * 0.19) : 0
  return { total_neto: n, iva, total_pagar: n + iva }
}

/** Gestión opera con monto total; en la ROC se desglosa neto + IVA. */
const calcMontosDesdeTotal = (total, aplicaIva) => {
  const t = Math.round(Number(total) || 0)
  if (!aplicaIva) {
    return { total_neto: t, iva: 0, total_pagar: t }
  }
  const neto = Math.round(t / 1.19)
  const iva = t - neto
  return { total_neto: neto, iva, total_pagar: t }
}

const pad2 = (n) => String(n).padStart(2, '0')

const formatMesAnio = (periodoYm) => {
  if (!periodoYm || periodoYm.length < 7) return ''
  const [year, month] = periodoYm.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' }).toUpperCase()
}

const formatIsoRange = (ini, fin) => {
  const fmt = (iso) => {
    const [y, m, d] = String(iso).slice(0, 10).split('-')
    return `${d}/${m}/${y}`
  }
  return `${fmt(ini)} AL ${fmt(fin)}`
}

/** Rango calendario del mes elegido (siempre fechas, aunque sea 1→último día). */
const formatCalendarioMes = (periodoYm) => {
  if (!periodoYm || periodoYm.length < 7) return ''
  const [year, month] = periodoYm.split('-').map(Number)
  const last = new Date(year, month, 0).getDate()
  return `${pad2(1)}/${pad2(month)}/${year} AL ${pad2(last)}/${pad2(month)}/${year}`
}

const AUTO_EST_GLOSA_LABELS = [
  'TOTALIDAD DE JARDINES INFANTILES VTF',
  'TOTALIDAD DE ESTABLECIMIENTOS (ESCUELAS/LICEOS)',
  'TOTALIDAD DE ESTABLECIMIENTOS',
  'OFICINA CENTRAL ADM.',
]

const normalizeEstGlosaLine = (line) =>
  String(line || '')
    .replace(/^\s*-\s*/, '')
    .trim()
    .toUpperCase()

const isAutoEstGlosaLine = (line) => {
  const t = normalizeEstGlosaLine(line)
  return AUTO_EST_GLOSA_LABELS.some((label) => t === label)
}

const isPureAutoEstGlosa = (descripcion) => {
  const text = String(descripcion || '').trim()
  if (!text) return true
  const chunks = text
    .split(/\r?\n/)
    .flatMap((line) => line.split(/\s*;\s*/))
    .map((s) => s.replace(/^\s*-\s*/, '').trim())
    .filter(Boolean)
  return chunks.length > 0 && chunks.every((c) => isAutoEstGlosaLine(c))
}

/**
 * Concepto a mano desde glosa persistida.
 * Solo limpia basura legacy (bullets / TOTALIDAD… / periodo); no inventa vacío
 * si el usuario escribió texto propio.
 */
const extractConceptoBase = (descripcion, periodoEtiqueta = '') => {
  const raw = String(descripcion || '')
  if (!raw.trim()) return ''
  if (isPureAutoEstGlosa(raw)) return ''

  let text = raw
  const lines = text.split(/\r?\n/)
  const kept = []
  for (const line of lines) {
    // A partir de bullets de establecimientos se corta (legacy)
    if (/^\s*-\s+\S/.test(line)) break
    // Label auto solo en su propia línea (no cortar si el usuario escribió otra cosa)
    if (isAutoEstGlosaLine(line) && kept.length === 0) continue
    if (isAutoEstGlosaLine(line)) break
    kept.push(line)
  }
  text = kept.join('\n').trimEnd()
  if (!text) return ''

  if (periodoEtiqueta) {
    const suffix = ` - ${periodoEtiqueta}`
    if (text.endsWith(suffix)) {
      text = text.slice(0, -suffix.length).trimEnd()
    }
  }

  text = text
    .replace(/\s+-\s+\d{2}\/\d{2}\/\d{4}\s+AL\s+\d{2}\/\d{2}\/\d{4}\s*$/i, '')
    .replace(
      /\s+-\s+(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)(\s+DE)?\s+\d{4}\s*$/i,
      '',
    )
    .trimEnd()

  for (const label of AUTO_EST_GLOSA_LABELS) {
    const suffix = ` - ${label}`
    if (text.toUpperCase().endsWith(suffix.toUpperCase())) {
      text = text.slice(0, -suffix.length).trimEnd()
    }
  }

  return text
}

/** Glosa RC = concepto + establecimientos (sin periodo). */
const composeGlosa = (concepto, smartSuffix) => {
  const base = String(concepto || '').trimEnd()
  const suffix = String(smartSuffix || '')
  if (!suffix) return base
  if (!base) {
    // Sin concepto: sin guiones iniciales (la plantilla suele unir con " - ")
    return suffix
      .split(/\r?\n/)
      .map((line) => line.replace(/^\s*-\s*/, '').trim())
      .filter(Boolean)
      .join('; ')
  }
  return `${base}${suffix}`
}

/** Une partes no vacías como en plantilla típica: detalle - periodo - glosa */
const joinDescripcionPlantilla = (...parts) =>
  parts
    .map((p) => String(p || '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(' - ')


/** IDs de establecimientos desde la RC (M2M o detalle anidado). */
const normalizeEstablecimientoIds = (rc) => {
  if (!rc) return []
  const fromM2m = Array.isArray(rc.establecimientos) ? rc.establecimientos : []
  const fromDetalle = Array.isArray(rc.establecimientos_detalle)
    ? rc.establecimientos_detalle
    : []
  const raw = fromM2m.length ? fromM2m : fromDetalle
  return [
    ...new Set(
      raw
        .map((e) => Number(e?.id ?? e))
        .filter((id) => Number.isFinite(id) && id > 0),
    ),
  ]
}

const collectPeriodoPares = (gestionResumen, establecimientos) => {
  const lineas = gestionResumen?.lineas || []
  const selectedEsts = (establecimientos || [])
    .map(Number)
    .filter((id) => Number.isFinite(id) && id > 0)

  const fromLineas = (rows) => {
    const unicos = []
    const seen = new Set()
    rows.forEach((l) => {
      if (!l?.tiene_periodo || !l.fecha_inicio || !l.fecha_fin) return
      const ini = String(l.fecha_inicio).slice(0, 10)
      const fin = String(l.fecha_fin).slice(0, 10)
      const key = `${ini}|${fin}`
      if (seen.has(key)) return
      seen.add(key)
      unicos.push({ ini, fin })
    })
    return unicos
  }

  let relevant = lineas.filter((l) => l.tiene_periodo && l.fecha_inicio && l.fecha_fin)
  if (selectedEsts.length) {
    const selectedSet = new Set(selectedEsts)
    const filtradas = relevant.filter((l) =>
      (l.establecimientos || []).some((id) => selectedSet.has(Number(id))),
    )
    // Si el filtro no matchea (IDs desalineados), usar todos los periodos de gestión
    if (filtradas.length) relevant = filtradas
  }

  let unicos = fromLineas(relevant)
  if (
    !unicos.length &&
    gestionResumen?.periodo_fecha_inicio &&
    gestionResumen?.periodo_fecha_fin
  ) {
    unicos = [
      {
        ini: String(gestionResumen.periodo_fecha_inicio).slice(0, 10),
        fin: String(gestionResumen.periodo_fecha_fin).slice(0, 10),
      },
    ]
  }
  return unicos
}

const buildPeriodoEtiqueta = (periodoYm, formato, pares, gestionResumen = null) => {
  if (!periodoYm) return ''
  if (formato === 'mes') return formatMesAnio(periodoYm)

  // Rango: siempre fechas reales de gestión (21→20), nunca el mes calendario inventado
  let ranges = pares || []
  if (
    !ranges.length &&
    gestionResumen?.periodo_fecha_inicio &&
    gestionResumen?.periodo_fecha_fin
  ) {
    ranges = [
      {
        ini: String(gestionResumen.periodo_fecha_inicio).slice(0, 10),
        fin: String(gestionResumen.periodo_fecha_fin).slice(0, 10),
      },
    ]
  }
  if (ranges.length === 1) return formatIsoRange(ranges[0].ini, ranges[0].fin)
  if (ranges.length > 1) {
    return ranges.map((p) => formatIsoRange(p.ini, p.fin)).join(' Y ')
  }
  return formatCalendarioMes(periodoYm)
}

const ContractReceptionModal = ({
  open,
  onClose,
  onSave,
  contract,
  receptions = [],
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
    descripcion: '',
    periodo: '',
    periodo_etiqueta: '',
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
  const [gestionResumen, setGestionResumen] = useState(null)
  const [periodoFormato, setPeriodoFormato] = useState('mes') // 'mes' | 'rango'
  const overlay = useFormOverlay()
  const fromGestion =
    Boolean(gestionResumen?.tiene_gestion) &&
    Number(gestionResumen?.lineas_con_periodo || 0) > 0

  useEffect(() => {
    if (!open || !contract) return
    overlay.reset()
    setGestionResumen(null)
    if (editingRC) {
      // Lista local (recién actualizada al guardar) > contrato > fila clickeada
      const rc =
        receptions.find((r) => Number(r.id) === Number(editingRC.id)) ||
        contract.recepciones?.find((r) => Number(r.id) === Number(editingRC.id)) ||
        editingRC
      setIsSplit(false)
      const etiqueta = rc.periodo_etiqueta || ''
      setPeriodoFormato(etiqueta.includes(' AL ') ? 'rango' : 'mes')
      setFormData({
        cdp: rc.cdp || contract?.cdp || '',
        nro_factura: rc.nro_factura || '',
        nro_oc: rc.nro_oc || '',
        fecha_recepcion: rc.fecha_recepcion || new Date().toISOString().split('T')[0],
        periodo: rc.periodo ? String(rc.periodo).substring(0, 7) : '',
        periodo_etiqueta: etiqueta,
        descripcion: extractConceptoBase(rc.descripcion, etiqueta),
        proveedor: rc.proveedor?.id || rc.proveedor || '',
        establecimientos: normalizeEstablecimientoIds(rc),
        tipo_entrega: rc.tipo_entrega?.id || rc.tipo_entrega || '',
        total_neto: rc.total_neto ?? '',
        iva: rc.iva ?? '',
        total_pagar: rc.total_pagar ?? '',
        grupo_firmante: rc.grupo_firmante?.id || rc.grupo_firmante || '',
        firmante: rc.firmante?.id || rc.firmante || '',
        folio: rc.folio || '',
      })
    } else {
      setIsSplit(false)
      setPeriodoFormato('mes')
      setFormData(buildInitial())
    }
    // Solo al abrir / cambiar de RC (no al refetch de contract).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingRC?.id])

  useEffect(() => {
    if (!open || !contract?.id || !formData.periodo || !formData.proveedor) {
      if (!formData.periodo || !formData.proveedor) setGestionResumen(null)
      return undefined
    }
    const [year, month] = formData.periodo.split('-')
    const mes = parseInt(month, 10)
    const anio = parseInt(year, 10)
    if (!mes || !anio) return undefined

    let cancelled = false
    api
      .get(`contratos/contratos/${contract.id}/resumen-periodo/`, {
        params: { mes, anio, proveedor: formData.proveedor },
      })
      .then((res) => {
        if (cancelled) return
        const data = res.data
        setGestionResumen(data)
        // Al crear (no editar), autocompletar montos/establecimientos desde gestión
        if (!editingRC && data?.tiene_gestion && data.lineas_con_periodo > 0) {
          const totalGestion = Number(data.total) || 0
          const montos = calcMontosDesdeTotal(
            totalGestion,
            contract?.aplica_iva !== false,
          )
          setIsSplit(false)
          setFormData((prev) => ({
            ...prev,
            ...montos,
            establecimientos: data.establecimientos_ids?.length
              ? data.establecimientos_ids
              : prev.establecimientos,
          }))
        }
      })
      .catch(() => {
        if (!cancelled) setGestionResumen(null)
      })
    return () => {
      cancelled = true
    }
  }, [open, contract?.id, contract?.aplica_iva, editingRC, formData.periodo, formData.proveedor])

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
    const pool =
      filteredEstablishments.length > 0 ? filteredEstablishments : establishments
    const count = formData.establecimientos.length
    const selectedSet = new Set(
      (formData.establecimientos || []).map((id) => Number(id)).filter((n) => Number.isFinite(n)),
    )
    const areaTotals = {}
    const areaCounts = {}
    establishmentTypes.forEach((t) => {
      const area = t.area_gestion || 'ESTABLECIMIENTO'
      areaTotals[area] =
        (areaTotals[area] || 0) + pool.filter((e) => e.tipo === t.id).length
      areaCounts[area] =
        (areaCounts[area] || 0) +
        pool.filter((e) => e.tipo === t.id && selectedSet.has(Number(e.id))).length
    })
    if (count > 5) {
      if (
        areaCounts.JARDIN === areaTotals.JARDIN &&
        count === areaCounts.JARDIN &&
        areaTotals.JARDIN > 0
      ) {
        return '\n- TOTALIDAD DE JARDINES INFANTILES VTF'
      }
      if (
        areaCounts.ESTABLECIMIENTO === areaTotals.ESTABLECIMIENTO &&
        count === areaCounts.ESTABLECIMIENTO &&
        areaTotals.ESTABLECIMIENTO > 0
      ) {
        return '\n- TOTALIDAD DE ESTABLECIMIENTOS (ESCUELAS/LICEOS)'
      }
      if (
        areaCounts.OFICINA === areaTotals.OFICINA &&
        count === areaCounts.OFICINA &&
        areaTotals.OFICINA > 0
      ) {
        return '\n- OFICINA CENTRAL ADM.'
      }
      if (count === pool.length) {
        return '\n- TOTALIDAD DE ESTABLECIMIENTOS'
      }
    }
    const names = formData.establecimientos
      .map((estId) => pool.find((e) => Number(e.id) === Number(estId))?.nombre)
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
          else {
            finalData.establecimientos = finalData.establecimientos
              .map((e) => Number(e?.id ?? e))
              .filter((id) => Number.isFinite(id) && id > 0)
          }
          const pares = collectPeriodoPares(gestionResumen, formData.establecimientos)
          const etiqueta = buildPeriodoEtiqueta(
            formData.periodo,
            periodoFormato,
            pares,
            gestionResumen,
          )
          finalData.periodo_etiqueta = etiqueta
          // Solo el concepto a mano. Establecimientos se arman al PDF vía M2M.
          finalData.descripcion = String(formData.descripcion || '').trim()
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

  const periodoPares = collectPeriodoPares(gestionResumen, formData.establecimientos)
  const periodoEtiqueta = buildPeriodoEtiqueta(
    formData.periodo,
    periodoFormato,
    periodoPares,
    gestionResumen,
  )
  const smartGlosa = isSplit ? '' : getSmartGlosa()
  const rcGlosa = composeGlosa(formData.descripcion, smartGlosa)
  const contratoDetallePreview =
    (contract?.detalle || '').trim() || (contract?.descripcion || '').trim()
  // Misma idea que plantilla típica: {{contrato_detalle}} - {{rc_periodo}} - {{rc_glosa}}
  const glosaPreview = joinDescripcionPlantilla(
    contratoDetallePreview,
    periodoEtiqueta,
    rcGlosa,
  )
  const periodoCortesHint =
    periodoFormato === 'rango' && periodoPares.length > 1
      ? periodoPares.map((p) => formatIsoRange(p.ini, p.fin)).join(' · ')
      : ''

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
        {!editingRC && formData.establecimientos?.length > 1 && !fromGestion ? (
          <div className="field field--full">
            <Switch
              id="rc-split"
              label={`Generar recepciones individuales (${formData.establecimientos.length} RCs)`}
              checked={isSplit}
              onChange={(e) => setIsSplit(e.target.checked)}
            />
          </div>
        ) : null}
        {fromGestion ? (
          <div className="field field--full">
            <Alert variant="info" title="Montos desde la gestión operativa">
              {`Total del periodo: ${gestionResumen.lineas_con_periodo} línea(s)`}
              {gestionResumen.faltantes
                ? ` · ${gestionResumen.faltantes} sin periodo abierto`
                : ''}
              . Ese total ya incluye IVA si el contrato lo aplica; aquí se desglosa en neto e IVA
              {contract?.aplica_iva === false ? ' (exento: neto = total)' : ''}. Puede editarlo. No se
              generan RCs por colegio.
            </Alert>
          </div>
        ) : gestionResumen?.tiene_gestion && !gestionResumen.lineas_con_periodo ? (
          <div className="field field--full">
            <Alert variant="warning" title="Sin periodos abiertos">
              Abra el mes en la gestión operativa para rellenar automáticamente el total.
            </Alert>
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
          <Field
            label="Cómo mostrar el periodo"
            htmlFor="rc-periodo-fmt"
            className="field--full"
            hint={
              !formData.periodo
                ? 'Elige primero el periodo de cobro (según gestión / contrato).'
                : periodoEtiqueta
                  ? `Se verá: ${periodoEtiqueta}`
                  : undefined
            }
          >
            <Select
              id="rc-periodo-fmt"
              value={periodoFormato}
              onChange={(e) => setPeriodoFormato(e.target.value)}
              disabled={!formData.periodo}
            >
              <option value="mes">Mes y año</option>
              <option value="rango">Rango de fechas</option>
            </Select>
          </Field>
        </div>

        <p className="contracts-section-title">4. Finanzas</p>
        <div className="form-grid">
          <Field
            label="Concepto / glosa"
            htmlFor="rc-desc"
            className="field--full"
            hint="Opcional. Solo lo que escribas a mano. Establecimientos y periodo se agregan en la vista previa / PDF."
          >
            <Textarea
              id="rc-desc"
              rows={3}
              value={formData.descripcion || ''}
              onChange={(e) => {
                const value = e.target.value
                setFormData((prev) => ({ ...prev, descripcion: value }))
              }}
            />
          </Field>
          <div className="field field--full">
            <Alert
              variant="info"
              title="Vista previa descripción (PDF)"
            >
              <pre className="contracts-glosa-preview">{glosaPreview || '—'}</pre>
              <p className="field__hint" style={{ margin: 'var(--space-2) 0 0' }}>
                Aprox. con chips: contrato_detalle — rc_periodo — rc_glosa
              </p>
              {periodoCortesHint ? (
                <p className="field__hint" style={{ margin: 'var(--space-2) 0 0' }}>
                  Varios cortes en este mes: {periodoCortesHint}.
                </p>
              ) : null}
            </Alert>
          </div>
        </div>
        <div className="form-grid form-grid--3">
          <Field label="Monto neto" required htmlFor="rc-neto">
            <CurrencyInput
              id="rc-neto"
              required
              value={formData.total_neto ?? ''}
              onChange={(val) =>
                setFormData((prev) => ({
                  ...prev,
                  ...calcMontos(val, contract?.aplica_iva !== false),
                }))
              }
            />
          </Field>
          <Field
            label="IVA"
            required
            htmlFor="rc-iva"
            hint={
              contract?.aplica_iva === false
                ? 'Este contrato no aplica IVA.'
                : fromGestion
                  ? 'Desglosado del total de gestión (editable).'
                  : '19% del neto (editable).'
            }
          >
            <CurrencyInput
              id="rc-iva"
              required
              value={formData.iva ?? ''}
              onChange={(val) => {
                const neto = Number(formData.total_neto) || 0
                const iva = Number(val) || 0
                setFormData({
                  ...formData,
                  iva,
                  total_pagar: neto + iva,
                })
              }}
            />
          </Field>
          <Field
            label="Total a pagar"
            required
            htmlFor="rc-total"
            hint={
              fromGestion
                ? 'Monto de gestión. Al editarlo se recalcula neto e IVA.'
                : undefined
            }
          >
            <CurrencyInput
              id="rc-total"
              required
              value={formData.total_pagar ?? ''}
              onChange={(val) => {
                setFormData((prev) => ({
                  ...prev,
                  ...calcMontosDesdeTotal(val, contract?.aplica_iva !== false),
                }))
              }}
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
