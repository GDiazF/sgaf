import React, { useEffect, useMemo, useState } from 'react'
import { format, eachDayOfInterval, parseISO, isWeekend } from 'date-fns'
import { es } from 'date-fns/locale'
import { Modal, Field, Select, Input, Button, Icon, EmptyState } from '@slep/ui'
import { usePermission } from '../../../hooks/usePermission'
import { useNotify } from '../../../hooks/useNotify'
import api from '../../../api'
import { formatM3Display, formatM3Input } from '../../../utils/formatM3'

function periodoForRuta(ruta, periodName) {
  return ruta.periodos?.find((p) => p.nombre_estandarizado === periodName)
}

function dateInPeriodo(periodo, fStr) {
  if (!periodo?.fecha_inicio || !periodo?.fecha_fin) return false
  const start = String(periodo.fecha_inicio).slice(0, 10)
  const end = String(periodo.fecha_fin).slice(0, 10)
  return fStr >= start && fStr <= end
}

function buildPeriodNames(rutas) {
  const names = new Set()
  rutas.forEach((r) => {
    r.periodos?.forEach((p) => {
      if (p.nombre_estandarizado) names.add(p.nombre_estandarizado)
    })
  })
  const months = [
    'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
    'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
  ]
  return Array.from(names).sort((a, b) => {
    const [mA, yA] = (a || '').split(' ')
    const [mB, yB] = (b || '').split(' ')
    if (yA !== yB) return (yB || 0) - (yA || 0)
    return months.indexOf(mB) - months.indexOf(mA)
  })
}

export default function BulkVolumenModal({ open, onClose, rutas, onUpdate, rowLabel = 'Establecimientos' }) {
  const { can } = usePermission()
  const { notify } = useNotify()
  const [selectedPeriodName, setSelectedPeriodName] = useState('')
  const [feriados, setFeriados] = useState([])
  const [cellEdit, setCellEdit] = useState(null)
  const [columnEdit, setColumnEdit] = useState(null)
  const [draftValue, setDraftValue] = useState('')
  const [saving, setSaving] = useState(false)

  const availablePeriodNames = useMemo(() => buildPeriodNames(rutas), [rutas])

  useEffect(() => {
    if (!open) {
      setSelectedPeriodName('')
      setCellEdit(null)
      setColumnEdit(null)
      return undefined
    }
    const fetchFeriados = async () => {
      try {
        const res = await api.get('contratos/feriados/')
        const lista = Array.isArray(res.data) ? res.data : res.data.results || []
        setFeriados(lista.map((f) => f.fecha))
      } catch {
        /* ignore */
      }
    }
    fetchFeriados()
    return undefined
  }, [open])

  useEffect(() => {
    if (!open || selectedPeriodName || availablePeriodNames.length === 0) return
    setSelectedPeriodName(availablePeriodNames[0])
  }, [open, selectedPeriodName, availablePeriodNames])

  const applicableRutas = useMemo(() => {
    if (!selectedPeriodName) return []
    return rutas.filter((r) => periodoForRuta(r, selectedPeriodName))
  }, [selectedPeriodName, rutas])

  const diasGrid = useMemo(() => {
    if (!selectedPeriodName || applicableRutas.length === 0) return []
    let minStart = null
    let maxEnd = null
    applicableRutas.forEach((ruta) => {
      const p = periodoForRuta(ruta, selectedPeriodName)
      if (!p) return
      const start = parseISO(String(p.fecha_inicio).slice(0, 10))
      const end = parseISO(String(p.fecha_fin).slice(0, 10))
      if (!minStart || start < minStart) minStart = start
      if (!maxEnd || end > maxEnd) maxEnd = end
    })
    if (!minStart || !maxEnd) return []
    return eachDayOfInterval({ start: minStart, end: maxEnd })
  }, [selectedPeriodName, applicableRutas])

  const openCellEdit = (ruta, fechaDate) => {
    const p = periodoForRuta(ruta, selectedPeriodName)
    if (!p || p.estado === 'CERRADO') return
    const fStr = format(fechaDate, 'yyyy-MM-dd')
    if (!dateInPeriodo(p, fStr)) return
    setColumnEdit(null)
    setCellEdit({
      rutaId: ruta.id,
      rutaNombre: ruta.nombre,
      periodoId: p.id,
      fecha: fStr,
      label: `${ruta.nombre} · ${format(fechaDate, "d 'de' MMMM", { locale: es })}`,
      value: formatM3Input(p.volumenes_dia?.[fStr] || ''),
      hadValue: Boolean(p.volumenes_dia?.[fStr]),
    })
    setDraftValue(formatM3Input(p.volumenes_dia?.[fStr] || ''))
  }

  const openColumnEdit = (fechaDate) => {
    const fStr = format(fechaDate, 'yyyy-MM-dd')
    const periodoIds = []
    applicableRutas.forEach((ruta) => {
      const p = periodoForRuta(ruta, selectedPeriodName)
      if (!p || p.estado === 'CERRADO' || !dateInPeriodo(p, fStr)) return
      const isSem = isWeekend(fechaDate)
      const isFer = feriados.includes(fStr)
      const incFinSem = p.regla?.incluir_fines_semana ?? ruta.incluir_fines_semana ?? false
      const excFer = p.regla?.excluir_feriados ?? ruta.excluir_feriados ?? false
      if ((isSem && !incFinSem) || (isFer && excFer)) return
      periodoIds.push(p.id)
    })
    if (periodoIds.length === 0) return
    setCellEdit(null)
    setColumnEdit({
      fecha: fStr,
      label: format(fechaDate, "EEEE d 'de' MMMM", { locale: es }),
      periodoIds,
    })
    setDraftValue('')
  }

  const saveCell = async (clear = false) => {
    if (!cellEdit) return
    setSaving(true)
    try {
      await api.post(`contratos/periodos/${cellEdit.periodoId}/volumen-dia/`, {
        fecha: cellEdit.fecha,
        volumen_m3: clear ? null : draftValue === '' ? null : String(draftValue).replace(',', '.'),
      })
      setCellEdit(null)
      await onUpdate()
      notify({ variant: 'success', text: clear ? 'Registro eliminado.' : 'Volumen guardado.' })
    } catch (err) {
      notify({
        variant: 'danger',
        text:
          err?.response?.data?.volumen_m3 ||
          err?.response?.data?.fecha ||
          err?.response?.data?.detail ||
          'No se pudo guardar.',
      })
    } finally {
      setSaving(false)
    }
  }

  const saveColumn = async (clear = false) => {
    if (!columnEdit) return
    setSaving(true)
    try {
      await api.post('contratos/periodos/bulk-volumen-dia/', {
        periodo_ids: columnEdit.periodoIds,
        fecha: columnEdit.fecha,
        volumen_m3: clear ? null : draftValue === '' ? null : String(draftValue).replace(',', '.'),
      })
      setColumnEdit(null)
      await onUpdate()
      notify({
        variant: 'success',
        text: clear ? 'Columna limpiada.' : 'Volumen aplicado a todas las líneas.',
      })
    } catch (err) {
      notify({
        variant: 'danger',
        text:
          err?.response?.data?.volumen_m3 ||
          err?.response?.data?.detail ||
          'No se pudo aplicar el volumen.',
      })
    } finally {
      setSaving(false)
    }
  }

  const canEdit = can('contratos.change_periodocobro')

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Planilla volumétrica"
        subheader={`Registra m³ por día en todos los ${rowLabel.toLowerCase()} del periodo`}
        className="rutas-detail-modal--sheet"
        headerActions={
          <div style={{ minWidth: 200 }}>
            <Field label="Periodo" htmlFor="bulk-vol-periodo">
              <Select
                id="bulk-vol-periodo"
                value={selectedPeriodName}
                onChange={(e) => setSelectedPeriodName(e.target.value)}
              >
                <option value="">— Elige un periodo —</option>
                {availablePeriodNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        }
        footer={
          <div className="rutas-detail-matrix-legend" style={{ borderTop: 0, padding: 0, width: '100%' }}>
            <div className="rutas-detail-matrix-legend__item">
              <span className="rutas-detail-matrix-legend__swatch rutas-detail-matrix-legend__swatch--vol" />
              Con m³
            </div>
            <div className="rutas-detail-matrix-legend__item">
              <span className="rutas-detail-matrix-legend__swatch rutas-detail-matrix-legend__swatch--empty" />
              Sin registro
            </div>
            <div className="rutas-detail-matrix-legend__item">
              <span className="rutas-detail-matrix-legend__swatch rutas-detail-matrix-legend__swatch--weekend" />
              No hábil
            </div>
            <div className="rutas-detail-matrix-legend__item" style={{ marginLeft: 'auto' }}>
              <Icon name="info" size="sm" /> Clic en celda: una línea · en encabezado del día: todas
            </div>
          </div>
        }
      >
        {!selectedPeriodName ? (
          <div style={{ padding: 'var(--space-8)' }}>
            <EmptyState
              title="Selecciona un periodo"
              description="Para cargar la planilla de m³."
            />
          </div>
        ) : applicableRutas.length === 0 ? (
          <div style={{ padding: 'var(--space-8)' }}>
            <EmptyState
              title="Sin líneas con periodo"
              description={`Ningún ${rowLabel.toLowerCase().slice(0, -1)} tiene este periodo abierto.`}
            />
          </div>
        ) : (
          <div className="rutas-detail-matrix-wrap">
            <table className="rutas-detail-matrix">
              <thead>
                <tr>
                  <th className="rutas-detail-matrix__sticky">
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)' }}>
                      {rowLabel} ({applicableRutas.length})
                    </span>
                  </th>
                  {diasGrid.map((fecha) => {
                    const fStr = format(fecha, 'yyyy-MM-dd')
                    const isSem = isWeekend(fecha)
                    const isFer = feriados.includes(fStr)

                    return (
                      <th
                        key={fecha.toString()}
                        onClick={() => canEdit && openColumnEdit(fecha)}
                        style={isSem ? { background: 'var(--bg)' } : undefined}
                        title="Aplicar m³ a todas las líneas este día"
                      >
                        <div className="rutas-detail-matrix__dayhead">
                          <>
                            <span>{format(fecha, 'EEE', { locale: es }).substring(0, 2)}</span>
                            <span style={isFer ? { color: 'var(--warning, #f59e0b)' } : undefined}>
                              {format(fecha, 'd')}
                            </span>
                          </>
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {applicableRutas.map((ruta) => {
                  const p = periodoForRuta(ruta, selectedPeriodName)
                  return (
                    <tr key={ruta.id}>
                      <td className="rutas-detail-matrix__sticky">
                        <strong style={{ display: 'block', fontSize: 'var(--text-xs)' }}>
                          {ruta.nombre}
                        </strong>
                        <span style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--primary)', marginTop: 2 }}>
                          {ruta.proveedor_nombre}
                        </span>
                      </td>
                      {diasGrid.map((fecha) => {
                        const fStr = format(fecha, 'yyyy-MM-dd')
                        const isSem = isWeekend(fecha)
                        const isFer = feriados.includes(fStr)
                        const vol = p?.volumenes_dia?.[fStr]
                        const hasVol = vol != null && vol !== ''

                        const incFinSem = p?.regla?.incluir_fines_semana ?? ruta.incluir_fines_semana ?? false
                        const excFer = p?.regla?.excluir_feriados ?? ruta.excluir_feriados ?? false
                        const outOfRange = !dateInPeriodo(p, fStr)
                        const isInvalidSem = isSem && !incFinSem
                        const isInvalidFer = isFer && excFer
                        const isInvalid = outOfRange || isInvalidSem || isInvalidFer
                        const isClosed = p?.estado === 'CERRADO'

                        return (
                          <td key={fStr}>
                            {isInvalid ? (
                              <div
                                className={`rutas-detail-matrix__blocked${isInvalidFer ? ' is-fer' : ''}`}
                                title={outOfRange ? 'Fuera del periodo de la línea' : isInvalidFer ? 'Feriado' : 'Fin de semana'}
                              >
                                {outOfRange ? '—' : isInvalidFer ? 'F' : '·'}
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openCellEdit(ruta, fecha)}
                                disabled={!p || isClosed || !canEdit}
                                className={`rutas-detail-matrix__cell${hasVol ? ' is-vol' : ''}`}
                                title={hasVol ? `${formatM3Display(vol)} m³` : 'Registrar m³'}
                              >
                                {hasVol ? formatM3Display(vol) : '·'}
                              </button>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      <Modal
        open={!!cellEdit}
        onClose={() => !saving && setCellEdit(null)}
        title="Volumen del día"
        subheader={cellEdit?.label}
        footer={
          <>
            <Button variant="ghost" disabled={saving} onClick={() => setCellEdit(null)}>
              Cancelar
            </Button>
            {cellEdit?.hadValue ? (
              <Button variant="secondary" disabled={saving} onClick={() => saveCell(true)}>
                Quitar
              </Button>
            ) : null}
            <Button
              variant="primary"
              loading={saving}
              disabled={saving || !draftValue}
              onClick={() => saveCell(false)}
            >
              Guardar
            </Button>
          </>
        }
      >
        <Field label="Metros cúbicos (m³)" htmlFor="bulk-vol-cell" required>
          <Input
            id="bulk-vol-cell"
            type="number"
            min="0"
            step="0.001"
            autoFocus
            value={draftValue}
            disabled={saving}
            onChange={(e) => setDraftValue(e.target.value)}
            placeholder="Ej. 8.5"
          />
        </Field>
      </Modal>

      <Modal
        open={!!columnEdit}
        onClose={() => !saving && setColumnEdit(null)}
        title="Volumen para todas las líneas"
        subheader={columnEdit?.label}
        footer={
          <>
            <Button variant="ghost" disabled={saving} onClick={() => setColumnEdit(null)}>
              Cancelar
            </Button>
            <Button variant="secondary" disabled={saving} onClick={() => saveColumn(true)}>
              Limpiar columna
            </Button>
            <Button
              variant="primary"
              loading={saving}
              disabled={saving || !draftValue}
              onClick={() => saveColumn(false)}
            >
              Aplicar a todas
            </Button>
          </>
        }
      >
        <p className="field__hint">
          Se aplicará a {columnEdit?.periodoIds?.length || 0} {rowLabel.toLowerCase()} con periodo
          abierto ese día.
        </p>
        <Field label="Metros cúbicos (m³)" htmlFor="bulk-vol-col" required>
          <Input
            id="bulk-vol-col"
            type="number"
            min="0"
            step="0.001"
            autoFocus
            value={draftValue}
            disabled={saving}
            onChange={(e) => setDraftValue(e.target.value)}
            placeholder="Ej. 10"
          />
        </Field>
      </Modal>
    </>
  )
}
